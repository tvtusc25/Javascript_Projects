//Helper functions to validate entries
const isValidEntry = (entry) => (
    entry &&
    typeof entry.name === 'string' &&
    entry.name.length <= 40 &&
    typeof entry.type === 'string' &&
    ['TAPE', 'CD', 'DVD'].includes(entry.type) &&
    typeof entry.desc === 'string' &&
    entry.desc.length <= 200
);

const validateExampleData = (data) => {
    if (!Array.isArray(data)) {
        console.error('Error: Example data should be an array.');
        return false;
    }

    for (const entry of data) {
        if (!isValidEntry(entry)) {
            console.error('Error: Invalid entry in example data.', entry);
            return false;
        }
    }
    return true;
};

module.exports = {
    isValidEntry,
    validateExampleData,
};
