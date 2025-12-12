const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse JSON body
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '.')));

// Load data from db.json
let db = { users: [] };
try {
    const data = fs.readFileSync('db.json', 'utf8');
    db = JSON.parse(data);
} catch (err) {
    console.error("Error reading db.json, creating a new one", err);
    // Ensure the file exists by writing an empty object to it
    fs.writeFileSync('db.json', JSON.stringify(db), 'utf8');
}

// Endpoint to register a new user
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Please provide all required fields.' });
    }

    // Check if the user already exists
    const userExists = db.users.find(user => user.email === email);
    if (userExists) {
        return res.status(409).json({ message: 'User already exists.' });
    }

    const newUser = {
        id: Date.now().toString(), // Simple ID generation
        name,
        email,
        password,
        tasks: [],
        notes: []
    };

    db.users.push(newUser);

    // Save to db.json
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2), 'utf8');

    res.status(201).json({ message: 'User registered successfully.', user: newUser });
});

// Endpoint to login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password.' });
    }

    const user = db.users.find(user => user.email === email && user.password === password);

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials.' });
    }

    res.status(200).json({ message: 'Logged in successfully.', user });
});

// Middleware to find user by email (for task and note operations)
const findUser = (req, res, next) => {
    const email = req.headers['x-user-email']; // Expect user email in the header
    if (!email) {
        return res.status(400).json({ message: 'User email not provided in headers.' });
    }

    const user = db.users.find(user => user.email === email);
    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }

    req.user = user; // Attach user object to request
    next();
};

// Apply findUser middleware to task-related endpoints
app.use(['/tasks', '/notes'], findUser);

// Tasks endpoint
app.get('/tasks', (req, res) => {
    res.status(200).json(req.user.tasks || []);
});

// Save task endpoint
app.post('/tasks', findUser, (req, res) => {
    const task = req.body;
    if (!task) {
        return res.status(400).json({ message: 'Task details not provided.' });
    }

    if (task.id) { // This is an edit
        const taskIndex = req.user.tasks.findIndex(t => t.id == task.id);
        if (taskIndex > -1) {
            req.user.tasks[taskIndex] = task;
        }
    } else { // This is a new task
        task.id = Date.now().toString();
        req.user.tasks.push(task);
    }

    fs.writeFileSync('db.json', JSON.stringify(db, null, 2), 'utf8');
    res.status(201).json({ message: 'Task saved successfully.', task });
});

// Delete task endpoint
app.delete('/tasks/:id', findUser, (req, res) => {
    const taskId = req.params.id;
    const taskIndex = req.user.tasks.findIndex(t => t.id == taskId);

    if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found.' });
    }

    req.user.tasks.splice(taskIndex, 1);
    fs.writeFileSync('db.json', JSON.stringify(db, null, 2), 'utf8');
    res.status(200).json({ message: 'Task deleted successfully.' });
});

// Toggle task completion endpoint
app.put('/tasks/:id/toggle', findUser, (req, res) => {
    const taskIndex = req.user.tasks.findIndex(t => t.id == req.params.id);
    if (taskIndex > -1) {
        req.user.tasks[taskIndex].completed = !req.user.tasks[taskIndex].completed;
        fs.writeFileSync('db.json', JSON.stringify(db, null, 2), 'utf8');
        res.status(200).json({ message: 'Task toggled', task: req.user.tasks[taskIndex] });
    } else {
        res.status(404).json({ message: 'Task not found' });
    }
});

// Notes endpoint
app.get('/notes', (req, res) => {
    res.status(200).json(req.user.notes || []);
});

// Save note endpoint
app.post('/notes', findUser, (req, res) => {
    const note = req.body;
    if (!note) {
        return res.status(400).json({ message: 'Note details not provided.' });
    }

    if (note.id) { // Edit
        const noteIndex = req.user.notes.findIndex(n => n.id == note.id);
        if (noteIndex > -1) {
            req.user.notes[noteIndex] = note;
        }
    } else { // Create
        note.id = Date.now().toString();
        req.user.notes.push(note);
    }

    fs.writeFileSync('db.json', JSON.stringify(db, null, 2), 'utf8');
    res.status(201).json({ message: 'Note saved successfully.', note });
});

// Delete note endpoint
app.delete('/notes/:id', findUser, (req, res) => {
    const noteId = req.params.id;
    const noteIndex = req.user.notes.findIndex(n => n.id == noteId);
    if (noteIndex > -1) {
        req.user.notes.splice(noteIndex, 1);
        fs.writeFileSync('db.json', JSON.stringify(db, null, 2), 'utf8');
        res.status(200).json({ message: 'Note deleted successfully.' });
    } else {
        res.status(404).json({ message: 'Note not found.' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});