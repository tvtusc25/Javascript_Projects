//Empty array to store movie list
let movies = [];
var numMovies = document.getElementById('numMovies')

//Fetch data from JSON
async function fetchData() {
    try {
        const response = await fetch('/data/movie_metadata_subset.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        movies = data;
        numMovies.textContent = `(${data.length})`;
        loadMovieList();
        updateQueueInfo();
    } catch (error) {
        console.error('Error loading JSON data:', error);
    }
}
fetchData();

//Constants for easy usage
const movieList = document.getElementById('movieList');
const queueList = document.getElementById('queueList');
const totalMovies = document.getElementById('totalMovies');
const totalDuration = document.getElementById('totalDuration');
const searchInput = document.getElementById('searchInput');

//Filter movies based on title search
function filterMovies(searchQuery) {
    const filteredMovies = movies.filter(movie => {
        //convert search and title to lowercase
        const movieTitle = movie.movie_title.toLowerCase();
        return movieTitle.includes(searchQuery.toLowerCase());
    });

    return filteredMovies;
}

//Load the shortened movie list ui based on search 
function loadFilteredMovies(searchQuery) {
    const filteredMovies = filterMovies(searchQuery);
    movieList.innerHTML = '';

    if (filteredMovies.length === 0) {
        movieList.innerHTML = '<li>No movies found</li>';
    } else {
        filteredMovies.forEach(movie => {
            const li = document.createElement('li');
            const formattedYear = parseInt(movie.title_year, 10);

            li.innerHTML = `<div class="movie-title">${movie.movie_title}</div> 
            (${movie.director_name}, ${formattedYear}, ${formatDuration(movie.duration)})
            <br>
            <button class="addBtn"><i class="fa fa-check"></i> Add</button>`;

            movieList.appendChild(li);
            li.querySelector('.addBtn').addEventListener('click', () => addToQueue(movie));
        });
    }
}

// Event listener to handle search input changes
searchInput.addEventListener('input', () => {
    const searchQuery = searchInput.value.trim();
    loadFilteredMovies(searchQuery);
});


//Load the movie list ui
function loadMovieList() {
    movieList.innerHTML = '';
    movies.forEach(movie => {
        const li = document.createElement('li');
        const formattedYear = parseInt(movie.title_year, 10);

        li.innerHTML = `<div class="movie-title">${movie.movie_title}</div> 
        (${movie.director_name}, ${formattedYear}, ${formatDuration(movie.duration)})
        <br>
        <button class="addBtn"><i class="fa fa-check"></i> Add</button>`;

        movieList.appendChild(li);
        li.querySelector('.addBtn').addEventListener('click', () => addToQueue(movie));
    });
}

//Add movie to queue
function addToQueue(movie) {
    const li = document.createElement('li');
    const formattedYear = parseInt(movie.title_year, 10);
    
    li.innerHTML = `
        <div class="movie-title">${movie.movie_title}</div>
        (${movie.director_name}, ${formattedYear}, ${formatDuration(movie.duration)})
        <br>
        <button class="removeBtn"><i class="fa fa-trash"></i> Remove</button>
    `;

    queueList.appendChild(li);
    li.querySelector('.removeBtn').addEventListener('click', () => removeFromQueue(li));
    
    updateQueueInfo();
}


//Remove a movie from the queue
function removeFromQueue(li) {
    queueList.removeChild(li);
    updateQueueInfo();
}

//Update the queue information
function updateQueueInfo() {
    totalMovies.textContent = queueList.children.length;
    totalDuration.textContent = calculateTotalDuration();
}

//Calculate total duration in HH:MM format
function calculateTotalDuration() {
    const queueItems = queueList.children;
    let totalMinutes = 0;

    for (let i = 0; i < queueItems.length; i++) {
        const itemText = queueItems[i].textContent;

        // Use a regular expression to match the duration format
        const durationMatch = itemText.match(/(\d+:\d+)/);

        if (durationMatch) {
            const durationText = durationMatch[0];
            const [hours, minutes] = durationText.split(':').map(Number);
            totalMinutes += hours * 60 + minutes;
        }
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}:${String(minutes).padStart(2, '0')}`;
}

//Format duration as HH:MM
function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${String(remainingMinutes).padStart(2, '0')}`;
}

// Initial rendering
loadMovieList();
updateQueueInfo();
