// Helper function to check if the target server exists
async function checkServerExists(targetURL) {
    try {
        const response = await fetch(targetURL);
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Helper function to transfer media to the target server
async function transferMedia(mediaStore, sourcePath, mediaObject, targetURL) {
    try {
        const sourceMedia = mediaObject;

        // POST the media resource to the target server
        const response = await fetch(targetURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sourceMedia)
        });

        if (response.ok) {
            // Delete the media resource from the source server
            mediaStore.delete(Number(sourcePath.split('/').pop(), 10));
            // Parse the response from the target server and return it with a fully qualified URL for the id
            const targetMedia = await response.json();
            targetMedia.id = new URL(targetMedia.id, targetURL).toString();
            return { success: true, resource: targetMedia };
        } else {
            // Return error if the transfer is not successful
            return { success: false };
        }
    } catch (error) {
        console.error('Error transferring media:', error);
        return { success: false };
    }
}

module.exports = {
    checkServerExists,
    transferMedia
};
