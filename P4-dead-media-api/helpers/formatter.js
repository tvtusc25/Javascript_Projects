//Helper function to fomrat media
const formatMedia = (media) => ({
    id: `/media/${media.id}`,
    name: media.name,
    type: media.type,
    desc: media.desc,
});

module.exports = {
    formatMedia,
};