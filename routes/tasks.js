const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/auth');

const tasksFilePath = path.join(__dirname, '..', 'data', 'tasks.json');

// Helper function to read tasks
const readTasks = () => {
  const data = fs.readFileSync(tasksFilePath, 'utf-8');
  return JSON.parse(data);
};

// Helper function to write tasks
const writeTasks = (tasks) => {
  fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2));
};

// @route   GET /api/tasks
// @desc    Get all tasks for logged in user
router.get('/', auth, (req, res) => {
  try {
    const tasks = readTasks();
    const userTasks = tasks.filter(task => task.owner === req.user.id);
    res.json(userTasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   POST /api/tasks
// @desc    Create a task
router.post('/', auth, (req, res) => {
  try {
    const { title, description, dueDate, status, completed } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Título é obrigatório' });
    }

    const tasks = readTasks();
    
    const newTask = {
      id: Date.now().toString(),
      title,
      description: description || '',
      dueDate: dueDate || '',
      status: status || 'To Do',
      completed: completed || false,
      owner: req.user.id,
      createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    writeTasks(tasks);

    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update a task
router.put('/:id', auth, (req, res) => {
  try {
    const tasks = readTasks();
    const taskIndex = tasks.findIndex(t => t.id === req.params.id);

    if (taskIndex === -1) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    // Make sure user owns task
    if (tasks[taskIndex].owner !== req.user.id) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const { title, description, dueDate, status, completed } = req.body;

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      title: title !== undefined ? title : tasks[taskIndex].title,
      description: description !== undefined ? description : tasks[taskIndex].description,
      dueDate: dueDate !== undefined ? dueDate : tasks[taskIndex].dueDate,
      status: status !== undefined ? status : tasks[taskIndex].status,
      completed: completed !== undefined ? completed : tasks[taskIndex].completed
    };

    writeTasks(tasks);

    res.json(tasks[taskIndex]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete a task
router.delete('/:id', auth, (req, res) => {
  try {
    let tasks = readTasks();
    const task = tasks.find(t => t.id === req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Tarefa não encontrada' });
    }

    // Make sure user owns task
    if (task.owner !== req.user.id) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    tasks = tasks.filter(t => t.id !== req.params.id);
    writeTasks(tasks);

    res.json({ message: 'Tarefa removida' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;
