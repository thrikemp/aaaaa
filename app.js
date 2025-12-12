// ZenList Task Manager - Main JavaScript File

// Global State Variables
let tasks = [];
let notes = [];
let editingTask = null;
let editingNoteIndex = null;
let currentFilter = 'all';
let deletingTaskIndex = null;
let currentTimerTaskIndex = null;
let timerInterval = null;
let timerSeconds = 0;
let totalTimerSeconds = 0;
let isTimerRunning = false;
let selectedMood = null;
let currentCalendarMonth = new Date();
let selectedCalendarDate = null;
let currentUser = null; // To store logged in user info

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

async function handleRegister() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (!name || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (!email.includes('@')) {
        alert('Please enter a valid email');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message);
            return;
        }

        alert('Registration successful! Please log in.');
        showLogin({ preventDefault: () => {} });

    } catch (error) {
        console.error('Registration failed:', error);
        alert('Registration failed. Please try again.');
    }
}


async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    if (!email.includes('@')) {
        alert('Please enter a valid email');
        return;
    }
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.message);
            return;
        }

        currentUser = result.user;
        // Store user info locally if needed, e.g., in sessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

        // Fetch user's data
        await fetchUserTasks();
        await fetchUserNotes();
        displayRandomQuote();

        // Update UI
        document.querySelector('#welcomeScreen .welcome-text').textContent = `Welcome ${currentUser.name}!`;
        document.querySelector('#taskListScreen .welcome-text').textContent = `Welcome ${currentUser.name}!`;

        showWelcomeScreen();

    } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
    }
}

function showLogin(e) {
    e.preventDefault();
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden-right');
}

function showRegister(e) {
    e.preventDefault();
    document.getElementById('loginScreen').classList.add('hidden-right');
    document.getElementById('registerScreen').classList.remove('hidden');
}

function showWelcomeScreen() {
    document.getElementById('registerScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('welcomeScreen').classList.remove('hidden-right');
}

// ============================================
// WELCOME SCREEN FUNCTIONS
// ============================================

function displayRandomQuote() {
    const quoteTextElement = document.querySelector('#quoteCard .quote-text');
    const quoteAuthorElement = document.querySelector('#quoteCard .quote-author');

    const quotes = [
        { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
        { text: "Everything you’ve ever wanted is on the other side of fear.", author: "George Addair" }
    ];

    const randomIndex = Math.floor(Math.random() * quotes.length);
    const randomQuote = quotes[randomIndex];

    quoteTextElement.textContent = `"${randomQuote.text}"`;
    quoteAuthorElement.textContent = `— ${randomQuote.author}`;
}

function closeQuote() {
    const quoteCard = document.getElementById('quoteCard');
    const emptyState = document.getElementById('emptyState');
    
    quoteCard.style.animation = 'slideDown 0.3s ease-out';
    
    setTimeout(() => {
        quoteCard.style.display = 'none';
        emptyState.style.display = 'block';
    }, 300);
}

function handleAddWelcome() {
    editingTask = null;
    clearTaskForm();
    
    document.getElementById('welcomeScreen').classList.add('hidden-right');
    document.getElementById('createTaskScreen').classList.remove('hidden-right');
}

function backToWelcome() {
    const currentScreen = document.querySelector('.screen:not(.hidden):not(.hidden-right)');
    if (currentScreen) {
        currentScreen.classList.add('hidden-right');
    }
    document.getElementById('welcomeScreen').classList.remove('hidden-right');
}

function backToLogin() {
    document.getElementById('welcomeScreen').classList.add('hidden-right');
    document.getElementById('loginScreen').classList.remove('hidden-right');
}

function backFromCreateTask() {
    const hasUnsavedChanges = document.getElementById('taskTitle').value || 
                             document.getElementById('taskDescription').value ||
                             document.getElementById('taskDate').value;
    
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to go back?')) {
        return;
    }
    
    // Determine where we came from
    if (tasks.length > 0) {
        document.getElementById('createTaskScreen').classList.add('hidden-right');
        document.getElementById('taskListScreen').classList.remove('hidden-right');
    } else {
        document.getElementById('createTaskScreen').classList.add('hidden-right');
        document.getElementById('welcomeScreen').classList.remove('hidden-right');
    }
}

function backFromCreateNote() {
    const hasUnsavedChanges = document.getElementById('noteTitle').value || 
                             document.getElementById('noteDescription').value;
    
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to go back?')) {
        return;
    }
    
    // Determine where we came from
    if (notes.length > 0) {
        document.getElementById('createNoteScreen').classList.add('hidden-right');
        document.getElementById('notesListScreen').classList.remove('hidden-right');
    } else {
        document.getElementById('createNoteScreen').classList.add('hidden-right');
        document.getElementById('welcomeScreen').classList.remove('hidden-right');
    }
}

function backFromTimer() {
    if (isTimerRunning) {
        if (!confirm('Timer is still running. Are you sure you want to go back?')) {
            return;
        }
        stopTimer();
    }
    
    document.getElementById('timerScreen').classList.add('hidden-right');
    document.getElementById('taskListScreen').classList.remove('hidden-right');
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

function showNotificationPage() {
    const currentScreen = document.querySelector('.screen:not(.hidden):not(.hidden-right)');
    if (currentScreen) {
        currentScreen.classList.add('hidden-right');
    }
    document.getElementById('notificationPage').classList.remove('hidden-right');
}

async function fetchUserTasks() {
    if (!currentUser) return;
    try {
        const response = await fetch('/tasks', {
            headers: { 'x-user-email': currentUser.email }
        });
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Failed to fetch tasks:', error);
    }
}

async function fetchUserNotes() {
    if (!currentUser) return;
    try {
        const response = await fetch('/notes', {
            headers: { 'x-user-email': currentUser.email }
        });
        notes = await response.json();
        renderNotes();
    } catch (error) {
        console.error('Failed to fetch notes:', error);
    }
}


// ============================================
// TASK MANAGEMENT FUNCTIONS
// ============================================

function clearTaskForm() {
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskDate').value = '';
    document.getElementById('taskPriority').value = '';
}

async function handleSaveTask() {
    const title = document.getElementById('taskTitle').value;
    const description = document.getElementById('taskDescription').value;
    const date = document.getElementById('taskDate').value;
    const priority = document.getElementById('taskPriority').value;
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }
    
    const task = {
        title,
        description,
        date,
        priority: priority || 'medium',
        completed: false
    };

    // If we are editing, add the id to the task object
    if (editingTask) {
        task.id = editingTask.id;
        task.completed = editingTask.completed; // Preserve completed state
    }

    try {
        const response = await fetch('/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-email': currentUser.email
            },
            body: JSON.stringify(task)
        });

        if (!response.ok) throw new Error('Failed to save task');

        await fetchUserTasks(); // Re-fetch all tasks to update the list
        clearTaskForm();
        editingTask = null;

        document.getElementById('createTaskScreen').classList.add('hidden-right');
        document.getElementById('taskListScreen').classList.remove('hidden-right');
        document.getElementById('taskListScreen').classList.remove('hidden');
    } catch (error) {
        console.error('Error saving task:', error);
        alert('Could not save the task. Please try again.');
    }
}

function handleAddFromList() {
    editingTask = null;
    clearTaskForm();
    
    document.getElementById('taskListScreen').classList.add('hidden-right');
    document.getElementById('createTaskScreen').classList.remove('hidden-right');
    document.getElementById('createTaskScreen').classList.remove('hidden');
}

function renderTasks(filterPriority = 'all') {
    const tasksList = document.getElementById('tasksList');
    currentFilter = filterPriority;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('filter' + filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1));
    if (activeBtn) activeBtn.classList.add('active');
    
    const filteredTasks = filterPriority === 'all' 
        ? tasks 
        : tasks.filter(task => task.priority === filterPriority);
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = `
            <div class="empty-tasks">
                <div class="empty-tasks-icon">📋</div>
                <div>No ${filterPriority === 'all' ? '' : filterPriority + ' priority '}tasks yet.<br>Click the + button to add your first task!</div>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = filteredTasks.map((task) => {
        const actualIndex = tasks.findIndex(t => t.id === task.id);
        const priorityBadge = task.priority ? `<span style="background: rgba(255,255,255,0.4); padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${task.priority}</span>` : '';
        return `
            <div class="task-card">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')"></div>
                <div class="task-icon" onclick="startTimer(${actualIndex})" style="cursor: pointer;">⏰</div>
                <div class="task-details">
                    <h3 class="task-name">${task.title}</h3>
                    <p class="task-date">${formatDate(task.date)} ${priorityBadge}</p>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn" onclick="editTask(${actualIndex})">✏️</button>
                    <button class="task-action-btn" onclick="deleteTask('${task.id}')">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function formatDate(dateString) {
    if (!dateString) return 'No date set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function toggleTask(taskId) {
    try {
        const response = await fetch(`/tasks/${taskId}/toggle`, {
            method: 'PUT',
            headers: { 'x-user-email': currentUser.email }
        });
        if (!response.ok) throw new Error('Failed to toggle task');
        await fetchUserTasks();
    } catch (error) {
        console.error('Error toggling task:', error);
        alert('Could not update task status.');
    }
}

function editTask(index) {
    editingTask = tasks[index];
    
    document.getElementById('taskTitle').value = editingTask.title;
    document.getElementById('taskDescription').value = editingTask.description;
    document.getElementById('taskDate').value = editingTask.date;
    document.getElementById('taskPriority').value = editingTask.priority;
    
    document.getElementById('taskListScreen').classList.add('hidden-right');
    document.getElementById('createTaskScreen').classList.remove('hidden-right');
    document.getElementById('createTaskScreen').classList.remove('hidden');
}

function deleteTask(taskId) {
    // Store the id of the task to be deleted
    deletingTaskIndex = taskId;
    document.getElementById('deleteModal').classList.add('show');
}

async function confirmDelete() {
    if (deletingTaskIndex) {
        try {
            const response = await fetch(`/tasks/${deletingTaskIndex}`, {
                method: 'DELETE',
                headers: { 'x-user-email': currentUser.email }
            });
            if (!response.ok) throw new Error('Failed to delete task');
            
            await fetchUserTasks(); // Refresh list
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Could not delete task.');
        }
        
        deletingTaskIndex = null;
        document.getElementById('deleteModal').classList.remove('show');
    }
}

function cancelDelete() {
    deletingTaskIndex = null;
    document.getElementById('deleteModal').classList.remove('show');
}

function filterTasks(priority) {
    renderTasks(priority);
}

// ============================================
// TIMER FUNCTIONS
// ============================================

function startTimer(taskIndex) {
    currentTimerTaskIndex = taskIndex;
    const task = tasks[taskIndex];
    
    // Set timer to 15 minutes (900 seconds) by default
    timerSeconds = 900;
    totalTimerSeconds = 900;
    
    document.getElementById('timerTaskName').textContent = task.title;
    document.getElementById('timerDisplay').textContent = formatTime(timerSeconds);
    
    // Show timer screen
    document.getElementById('taskListScreen').classList.add('hidden-right');
    document.getElementById('timerScreen').classList.remove('hidden-right');
    
    // Start the timer automatically
    isTimerRunning = true;
    document.getElementById('pauseIcon').style.display = 'inline';
    document.getElementById('playIcon').style.display = 'none';
    
    updateProgressBar();
    startTimerInterval();
}

function startTimerInterval() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        if (isTimerRunning && timerSeconds > 0) {
            timerSeconds--;
            document.getElementById('timerDisplay').textContent = formatTime(timerSeconds);
            updateProgressBar();
            
            if (timerSeconds === 0) {
                completeTimerTask();
            }
        }
    }, 1000);
}

function toggleTimer() {
    isTimerRunning = !isTimerRunning;
    
    const pauseIcon = document.getElementById('pauseIcon');
    const playIcon = document.getElementById('playIcon');
    
    if (isTimerRunning) {
        pauseIcon.style.display = 'inline';
        playIcon.style.display = 'none';
    } else {
        pauseIcon.style.display = 'none';
        playIcon.style.display = 'inline';
    }
}

function updateProgressBar() {
    const progressBar = document.getElementById('progressBar');
    const circumference = 2 * Math.PI * 130;
    const progress = (timerSeconds / totalTimerSeconds);
    const offset = circumference * (1 - progress);
    
    progressBar.style.strokeDashoffset = offset;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function completeTimerTask() {
    if (currentTimerTaskIndex !== null) {
        tasks[currentTimerTaskIndex].completed = true;
        stopTimer();
        returnToTaskList();
    }
}

function completeTaskEarly() {
    if (currentTimerTaskIndex !== null) {
        tasks[currentTimerTaskIndex].completed = true;
        stopTimer();
        returnToTaskList();
    }
}

function stopTimer() {
    isTimerRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function returnToTaskList() {
    document.getElementById('timerScreen').classList.add('hidden-right');
    document.getElementById('taskListScreen').classList.remove('hidden-right');
    renderTasks(currentFilter);
    currentTimerTaskIndex = null;
}

// ============================================
// NOTE MANAGEMENT FUNCTIONS
// ============================================

function handleCreateNote() {
    editingNoteIndex = null;
    selectedMood = null;
    clearNoteForm();
    
    document.getElementById('welcomeScreen').classList.add('hidden-right');
    document.getElementById('createNoteScreen').classList.remove('hidden-right');
}

function clearNoteForm() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteDescription').value = '';
    
    // Reset mood selection
    document.querySelectorAll('.mood-emoji').forEach(emoji => {
        emoji.classList.remove('selected');
    });
}

function selectMood(mood, element) {
    selectedMood = mood;
    
    // Remove selected class from all emojis
    document.querySelectorAll('.mood-emoji').forEach(emoji => {
        emoji.classList.remove('selected');
    });
    
    // Add selected class to clicked emoji
    element.classList.add('selected');
}

async function handleSaveNote() {
    const title = document.getElementById('noteTitle').value;
    const description = document.getElementById('noteDescription').value;
    
    if (!title) {
        alert('Please enter a note title');
        return;
    }
    
    // Get current date and time in local timezone
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Create ISO-like string but in local timezone
    const localDateString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    
    const note = {
        title,
        description,
        mood: selectedMood,
        date: localDateString
    };

    if (editingNoteIndex !== null) {
        note.id = notes[editingNoteIndex].id;
    }

    try {
        const response = await fetch('/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-email': currentUser.email
            },
            body: JSON.stringify(note)
        });
        if (!response.ok) throw new Error('Failed to save note');

        await fetchUserNotes();
        clearNoteForm();
        editingNoteIndex = null;

        document.getElementById('createNoteScreen').classList.add('hidden-right');
        document.getElementById('notesListScreen').classList.remove('hidden-right');
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Could not save note.');
    }
}
function handleDiscardNote() {
    clearNoteForm();
    
    document.getElementById('createNoteScreen').classList.add('hidden-right');
    document.getElementById('welcomeScreen').classList.remove('hidden-right');
}

function handleAddNoteFromList() {
    editingNoteIndex = null;
    selectedMood = null;
    clearNoteForm();
    
    document.getElementById('notesListScreen').classList.add('hidden-right');
    document.getElementById('createNoteScreen').classList.remove('hidden-right');
}

function renderNotes() {
    const notesList = document.getElementById('notesList');
    
    if (notes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-notes">
                <div class="empty-notes-icon">📝</div>
                <div>No notes yet.<br>Click the + button to create your first note!</div>
            </div>
        `;
        return;
    }
    
    const moodEmojis = {
        'happy': '😊',
        'tired': '😴',
        'angry': '😠',
        'smirk': '😏'
    };
    
    notesList.innerHTML = notes.map((note, index) => {
        const moodEmoji = note.mood ? moodEmojis[note.mood] : '😊';
        return `
            <div class="note-card">
                <div class="note-card-header">
                    <h3 class="note-card-title">${note.title}</h3>
                    <span class="note-card-mood">${moodEmoji}</span>
                </div>
                <p class="note-card-description">${note.description || 'No description'}</p>
                <p class="note-card-date">${formatNoteDate(note.date)}</p>
                <div class="note-card-actions">
                    <button class="note-action-btn" onclick="editNote(${index})">Edit</button>
                    <button class="note-action-btn" onclick="deleteNote('${note.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function formatNoteDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function editNote(index) {
    const note = notes[index];
    
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteDescription').value = note.description;
    
    // Set mood selection
    selectedMood = note.mood;
    document.querySelectorAll('.mood-emoji').forEach(emoji => {
        if (emoji.dataset.mood === note.mood) {
            emoji.classList.add('selected');
        } else {
            emoji.classList.remove('selected');
        }
    });
    
    editingNoteIndex = index;
    
    document.getElementById('notesListScreen').classList.add('hidden-right');
    document.getElementById('createNoteScreen').classList.remove('hidden-right');
}

async function deleteNote(noteId) {
    if (confirm('Are you sure you want to delete this note?')) {
        try {
            const response = await fetch(`/notes/${noteId}`, {
                method: 'DELETE',
                headers: { 'x-user-email': currentUser.email }
            });
            if (!response.ok) throw new Error('Failed to delete note');

            await fetchUserNotes(); // Refresh list
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Could not delete note.');
        }
    }
}

// ============================================
// CALENDAR FUNCTIONS
// ============================================

function openCalendar() {
    currentCalendarMonth = new Date();
    selectedCalendarDate = null;
    renderCalendar();
    
    document.getElementById('createTaskScreen').classList.add('hidden-right');
    document.getElementById('calendarScreen').classList.remove('hidden-right');
}

function openCalendarFromWelcome() {
    currentCalendarMonth = new Date();
    selectedCalendarDate = null;
    renderCalendar();
    
    document.getElementById('welcomeScreen').classList.add('hidden-right');
    document.getElementById('calendarScreen').classList.remove('hidden-right');
}

function closeCalendar() {
    // Determine where to go back
    if (tasks.length > 0 && document.getElementById('createTaskScreen').classList.contains('hidden-right')) {
        // If we came from task list or create task
        document.getElementById('calendarScreen').classList.add('hidden-right');
        document.getElementById('welcomeScreen').classList.remove('hidden-right');
    } else if (!document.getElementById('createTaskScreen').classList.contains('hidden-right')) {
        // If we came from create task screen
        document.getElementById('calendarScreen').classList.add('hidden-right');
        document.getElementById('createTaskScreen').classList.remove('hidden-right');
    } else {
        // Default to welcome screen
        document.getElementById('calendarScreen').classList.add('hidden-right');
        document.getElementById('welcomeScreen').classList.remove('hidden-right');
    }
}

function changeMonth(direction) {
    currentCalendarMonth.setMonth(currentCalendarMonth.getMonth() + direction);
    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    
    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    // Build calendar grid
    let calendarHTML = '';
    
    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if this date has tasks or notes
        const hasTasks = tasks.some(task => task.date === dateStr);
        const hasNotes = notes.some(note => {
            // Extract just the date part from the note's timestamp
            const noteDate = note.date.split('T')[0];
            return noteDate === dateStr;
        });
        
        const isToday = today.getDate() === day && 
                       today.getMonth() === month && 
                       today.getFullYear() === year;
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (hasTasks || hasNotes) classes += ' has-items';
        
        let indicators = '';
        if (hasTasks || hasNotes) {
            indicators = '<div class="calendar-indicators">';
            if (hasTasks) indicators += '<div class="calendar-dot task"></div>';
            if (hasNotes) indicators += '<div class="calendar-dot note"></div>';
            indicators += '</div>';
        }
        
        calendarHTML += `
            <div class="${classes}" onclick="selectDate('${dateStr}')">
                <span>${day}</span>
                ${indicators}
            </div>
        `;
    }
    
    document.getElementById('calendarGrid').innerHTML = calendarHTML;
}

function selectDate(dateStr) {
    selectedCalendarDate = dateStr;
    
    // Update selected styling
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    event.target.closest('.calendar-day').classList.add('selected');
    
    // Get items for this date
    const dateTasks = tasks.filter(task => task.date === dateStr);
    const dateNotes = notes.filter(note => {
        // Extract just the date part from the note's timestamp
        const noteDate = note.date.split('T')[0];
        return noteDate === dateStr;
    });
    
    // Format date for display
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    document.getElementById('selectedDateTitle').textContent = `Items for ${formattedDate}`;
    
    if (dateTasks.length === 0 && dateNotes.length === 0) {
        document.getElementById('calendarItemsSection').style.display = 'none';
        return;
    }
    
    document.getElementById('calendarItemsSection').style.display = 'block';
    
    let itemsHTML = '';
    
    // Add tasks
    dateTasks.forEach(task => {
        const priorityBadge = task.priority ? `<span style="font-size: 11px; opacity: 0.9;"> • ${task.priority.toUpperCase()}</span>` : '';
        itemsHTML += `
            <div class="calendar-item-card">
                <div class="calendar-item-icon">✓</div>
                <div class="calendar-item-details">
                    <h3 class="calendar-item-title">${task.title}</h3>
                    <p class="calendar-item-type">Task${priorityBadge}</p>
                </div>
            </div>
        `;
    });
    
    // Add notes
    const moodEmojis = {
        'happy': '😊',
        'tired': '😴',
        'angry': '😠',
        'smirk': '😏'
    };
    
    dateNotes.forEach(note => {
        const moodEmoji = note.mood ? moodEmojis[note.mood] : '📝';
        itemsHTML += `
            <div class="calendar-item-card note-item">
                <div class="calendar-item-icon">${moodEmoji}</div>
                <div class="calendar-item-details">
                    <h3 class="calendar-item-title">${note.title}</h3>
                    <p class="calendar-item-type">Note</p>
                </div>
            </div>
        `;
    });
    
    if (itemsHTML === '') {
        itemsHTML = '<div class="calendar-empty">No items for this date</div>';
    }
    
    document.getElementById('calendarItemsList').innerHTML = itemsHTML;
}

// ============================================
// INITIALIZATION
// ============================================

// Make sure the page is ready before executing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    // Check if a user is already logged in from a previous session
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        // Potentially fetch data right away and skip to welcome screen
    }

    console.log('ZenList Task Manager initialized!');
    
    // Ensure all functions are available globally
    window.handleRegister = handleRegister;
    window.handleLogin = handleLogin;
    window.showLogin = showLogin;
    window.showRegister = showRegister;
    window.displayRandomQuote = displayRandomQuote;
    window.closeQuote = closeQuote;
    window.handleAddWelcome = handleAddWelcome;
    window.backToWelcome = backToWelcome;
    window.backToLogin = backToLogin;
    window.backFromCreateTask = backFromCreateTask;
    window.backFromCreateNote = backFromCreateNote;
    window.backFromTimer = backFromTimer;
    window.showNotificationPage = showNotificationPage;
    window.handleSaveTask = handleSaveTask;
    window.handleAddFromList = handleAddFromList;
    window.toggleTask = toggleTask;
    window.editTask = editTask;
    window.deleteTask = deleteTask;
    window.confirmDelete = confirmDelete;
    window.cancelDelete = cancelDelete;
    window.filterTasks = filterTasks;
    window.startTimer = startTimer;
    window.toggleTimer = toggleTimer;
    window.completeTaskEarly = completeTaskEarly;
    window.handleCreateNote = handleCreateNote;
    window.selectMood = selectMood;
    window.handleSaveNote = handleSaveNote;
    window.handleDiscardNote = handleDiscardNote;
    window.handleAddNoteFromList = handleAddNoteFromList;
    window.editNote = editNote;
    window.deleteNote = deleteNote;
    window.openCalendar = openCalendar;
    window.openCalendarFromWelcome = openCalendarFromWelcome;
    window.closeCalendar = closeCalendar;
    window.changeMonth = changeMonth;
    window.selectDate = selectDate;
}
