const express = require('express');
const fs = require('fs');
const { MediaStore } = require('./store.js');
const { isValidEntry, validateExampleData } = require('./helpers/validation.js');
const { formatMedia } = require('./helpers/formatter.js');
const { checkServerExists, transferMedia } = require('./helpers/transferHelpers.js');

const app = express();
const port = 3000;
const filePath = process.argv[2];
app.use(express.json());

// Check if the file path is provided
if (!filePath) {
    console.error('Error: Please provide the path of the example data file.');
    process.exit(1);
}

// Check if the file exists
if (!fs.existsSync(filePath)) {
    console.error(`Error: The file ${filePath} does not exist.`);
    process.exit(1);
}

// Read and parse the example data
let exampleData;
try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    exampleData = JSON.parse(fileContent);
} catch (error) {
    console.error('Error: Failed to parse the example data file. Make sure it is valid JSON.');
    process.exit(1);
}

// Validate the example data
if (!validateExampleData(exampleData)) {
    console.error('Error: Example data does not satisfy validation constraints.');
    process.exit(1);
}

// Instantiate MediaStore and load data into store
const mediaStore = new MediaStore();
try {
    exampleData.forEach(mediaObject => {
        mediaStore.create(mediaObject.name, mediaObject.type, mediaObject.desc);
    });
} catch (error) {
    console.error('Error: Failed to load example data into the store.', error);
    process.exit(1);
}

// GET endpoint for /media
app.get('/media', async (req, res) => {
    console.log('GET /media endpoint called');
    try {
        const allMedia = await mediaStore.retrieveAll();
        // Extract query parameters from the URL
        const { limit: limitParam, offset: offsetParam, name, type, desc } = req.query;
        // Validate that limit and offset are positive integers
        const limit = parseInt(limitParam, 10) || allMedia.length; // Default to all items
        const offset = parseInt(offsetParam, 10) || 0; // Default to 0
        if (isNaN(limit) || isNaN(offset) || limit < 0 || offset < 0) {
            console.error('Error: Invalid limit or offset parameters.');
            return res.status(500).end(); // invalid format: 500
        }

        // Filter media based on query parameters
        let filteredMedia = [...allMedia];
        const previousParams = [];
        if (name) filteredMedia = filteredMedia.filter((media) => media.name === name);
        if (type) filteredMedia = filteredMedia.filter((media) => media.type === type);
        if (desc) filteredMedia = filteredMedia.filter((media) => media.desc === desc);        

        // Calculate the paginated result
        const paginatedMedia = filteredMedia.slice(offset, offset + limit);
        const totalCount = filteredMedia.length;

        // Construct pagination information
        let previousOffset = Math.max(0, offset - limit); // Calculate previous offset
        let previousLimit = offset - previousOffset; // Calculate previous limit

        const paginationInfo = {
            count: totalCount,
            next: offset + limit < totalCount ? `/media?${name ? `name=${name}&` : ''}${type ? `type=${type}&` : ''}${desc ? `desc=${desc}&` : ''}limit=${limit}&offset=${offset + limit}` : null,
            previous: previousLimit > 0 ? `/media?${name ? `name=${name}&` : ''}${type ? `type=${type}&` : ''}${desc ? `desc=${desc}&` : ''}limit=${previousLimit}&offset=${previousOffset}` : null,
            results: paginatedMedia.map((media) => ({
                id: `/media/${media.id}`,
                name: media.name,
                type: media.type,
                desc: media.desc,
            })),
        };

        if (paginatedMedia.length > 0) {
            console.log('GET /media - Retrieved paginated media with query: ', paginatedMedia);
            return res.status(200).json(paginationInfo); // success: 200
        } else {
            console.log('Media list is empty. Sending 204 response.');
            return res.status(204).end(); // empty list: 204
        }
    } catch (error) {
        console.error('Error: Failed to retrieve paginated media objects with query.', error);
        return res.status(500).end(); // all other errors: 500
    }
});


// GET endpoint for /media/:id
app.get('/media/:id', async (req, res) => {
    const mediaId = req.params.id;
    console.log(`GET /media/${mediaId} endpoint called`);
    try {
        // Retrieve the specific media object by id
        const media = await mediaStore.retrieve(Number(mediaId));
        const formattedMedia = formatMedia(media);

        console.log(`GET /media/${mediaId} - Retrieved media:`, formattedMedia);
        res.status(200).json(formattedMedia); // success: 200
    } catch (error) {
        if (error.includes('cannot find')) {
            console.log(`GET /media/${mediaId} - Media not found. Sending 404 response.`);
            res.status(404).end(); // missing media: 404
        } else {
            console.error(`GET /media/${mediaId} - Error: Failed to retrieve media object.`, error);
            res.status(500).end(); // all other errors: 500
        }
    }
});

// POST endpoint for /media
app.post('/media', async (req, res) => {
    console.log('POST /media endpoint called');
    try {
        //Validate entry
        const { name, type, desc } = req.body;
        if (!isValidEntry({ name, type, desc })) {
            console.log('Invalid request data. Sending 400 response.');
            res.status(400).end(); //invalid format: 400
            return;
        }

        // Create and retrieve a new dead media entity in the store
        const newMediaId = await mediaStore.create(name, type, desc);
        const newMedia = await mediaStore.retrieve(newMediaId);
        const formattedMedia = formatMedia(newMedia);

        console.log('POST /media - Created new media:', formattedMedia);
        res.status(201).json(formattedMedia); //success: 201
    } catch (error) {
        console.error('Error: Failed to create new media object.', error);
        res.status(500).end(); //all other errors: 500
    }
});

// POST endpoint for /transfer
app.post('/transfer', async (req, res) => {
    console.log('POST /transfer endpoint called');
    try {
        const { source, target } = req.body;
        // Validate that source and target are valid URLs
        const sourceURL = new URL(source, `http://${req.headers.host}`);
        const targetURL = new URL(target);

        // Check if the resource specified in the Transfer's source field exists
        const sourceMedia = await mediaStore.retrieve(Number(sourceURL.pathname.split('/').pop(), 10));
        if (!sourceMedia) {
            console.error('Error: Source resource not found.');
            return res.status(404).end(); // Not Found
        }

        // Check if the server specified in the Transfer's target field exists
        const targetExists = await checkServerExists(targetURL);
        if (!targetExists) {
            console.error('Error: Target server not found.');
            return res.status(421).end(); // Misdirected Request
        }

        // POST the media resource to the target server and delete it from the source server
        const transferResult = await transferMedia(mediaStore, sourceURL.pathname, sourceMedia, targetURL);
        if (transferResult.success) {
            // If the transfer is successful, return the response from the target server
            console.log('POST /transfer - Transfer successful: ', transferResult.resource);
            return res.status(200).json(transferResult.resource);
        } else {
            console.error('Error: Failed to transfer media.');
            return res.status(500).end(); // Internal Server Error
        }
    } catch (error) {
        console.error('Error: Invalid Transfer resource.', error);
        return res.status(500).end(); // Internal Server Error
    }
});

// PUT endpoint for /media/:id
app.put('/media/:id', async (req, res) => {
    const mediaId = req.params.id;
    console.log(`PUT /media/${mediaId} endpoint called`);
    try {
        // Retrieve the specific media object by id
       await mediaStore.retrieve(Number(mediaId));

        // Validate entry
        const { name, type, desc } = req.body;
        if (!isValidEntry({ name, type, desc })) {
            console.log('Invalid request data. Sending 400 response.');
            res.status(400).end();
            return;
        }

        // Update and retreive the media object
        await mediaStore.update(Number(mediaId), name, type, desc);
        const updatedMedia = await mediaStore.retrieve(Number(mediaId));
        const formattedMedia = formatMedia(updatedMedia);

        console.log(`PUT /media/${mediaId} - Updated media:`, formattedMedia);
        res.status(200).json(formattedMedia); // success: 200
    } catch (error) {
        if (error.includes('cannot find')) {
            console.log(`PUT /media/${mediaId} - Media not found. Sending 404 response.`);
            res.status(404).end(); // missing media: 404
        } else {
            console.error(`PUT /media/${mediaId} - Error: Failed to retrieve media object.`, error);
            res.status(500).end(); // all other errors: 500
        }
    }
});

// DELETE endpoint for /media/:id
app.delete('/media/:id', async (req, res) => {
    const mediaId = req.params.id;
    console.log(`DELETE /media/${mediaId} endpoint called`);
    try {
        const deletedMediaId = await mediaStore.delete(Number(mediaId));
        console.log(`DELETE /media/${mediaId} - Media successfully deleted: `, deletedMediaId);
        res.status(204).end(); // success: 204
    } catch (error) {
        if (error.includes('cannot find')) {
            console.log(`DELETE /media/${mediaId} - Media not found. Sending 404 response.`);
            res.status(404).end(); // missing media: 404
        } else {
            console.error(`DELETE /media/${mediaId} - Error: Failed to retrieve media object.`, error);
            res.status(500).end(); // all other errors: 500
        }
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

module.exports = app;
