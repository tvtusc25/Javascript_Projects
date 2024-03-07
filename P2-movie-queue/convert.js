const fs = require('fs');

const csvPath = './data/movie_metadata_subset.csv';
const jsonPath = './data/movie_metadata_subset.json';

const parseCSV = (csvData) => {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',');
  const jsonData = [];

  for (let line = 1; line < lines.length; line++) {
    const data = lines[line].split(',');
    const movie = {};
    for (let header = 0; header < headers.length; header++) {
      movie[headers[header]] = data[header];
    }
    jsonData.push(movie);
  }

  return jsonData;
};

const convertCSVtoJSON = () => {
  try {
    const jsonData = parseCSV(fs.readFileSync(csvPath, 'utf-8'));

    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log('Success');
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

convertCSVtoJSON();
