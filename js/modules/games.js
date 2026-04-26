// DKANAN - Entertainment / Games Module
// Mini-games for user engagement and entertainment

const GamesModule = (function() {
  'use strict';
  
  // State
  let currentGame = null;
  let gameScores = {};
  let gameState = {};
  
  // Available games
  const GAMES = [
    {
      id: 'art_quiz',
      name: 'Art Quiz',
      description: 'Test your knowledge of art history and techniques',
      icon: 'fa-palette',
      color: '#8b5cf6'
    },
    {
      id: 'color_match',
      name: 'Color Match',
      description: 'Match colors to create beautiful combinations',
      icon: 'fa-fill-drip',
      color: '#ec4899'
    },
    {
      id: 'sketch_challenge',
      name: 'Sketch Challenge',
      description: 'Quick drawing challenges with time limits',
      icon: 'fa-pencil-alt',
      color: '#f59e0b'
    },
    {
      id: 'word_puzzle',
      name: 'Art Word Puzzle',
      description: 'Unscramble art-related words',
      icon: 'fa-puzzle-piece',
      color: '#10b981'
    }
  ];
  
  // Initialize
  function init() {
    loadScores();
  }
  
  // Load user scores
  async function loadScores() {
    if (!window.currentUser) return;
    
    try {
      const { db } = window.firebaseServices;
      const snapshot = await db.collection('games')
        .where('userId', '==', window.currentUser.uid)
        .get();
      
      gameScores = {};
      snapshot.docs.forEach(doc => {
        gameScores[doc.data().gameId] = doc.data();
      });
    } catch (error) {
      console.error('Error loading scores:', error);
    }
  }
  
  // Show games hub
  function showGamesHub() {
    const container = document.getElementById('gamesContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="games-header">
        <h2><i class="fas fa-gamepad"></i> Art Games</h2>
        <p>Challenge yourself and earn points!</p>
      </div>
      <div class="games-grid">
        ${GAMES.map(game => renderGameCard(game)).join('')}
      </div>
    `;
  }
  
  // Render game card
  function renderGameCard(game) {
    const highScore = gameScores[game.id]?.highScore || 0;
    
    return `
      <div class="game-card" onclick="GamesModule.startGame('${game.id}')" style="border-color:${game.color}">
        <div class="game-icon" style="background:${game.color}">
          <i class="fas ${game.icon}"></i>
        </div>
        <h3>${game.name}</h3>
        <p>${game.description}</p>
        <div class="game-score">
          <span><i class="fas fa-trophy"></i> High Score: ${highScore}</span>
        </div>
      </div>
    `;
  }
  
  // Start game
  function startGame(gameId) {
    currentGame = gameId;
    
    switch (gameId) {
      case 'art_quiz':
        startArtQuiz();
        break;
      case 'color_match':
        startColorMatch();
        break;
      case 'sketch_challenge':
        startSketchChallenge();
        break;
      case 'word_puzzle':
        startWordPuzzle();
        break;
    }
  }
  
  // Art Quiz Game
  function startArtQuiz() {
    const questions = [
      { q: 'Who painted the Mona Lisa?', options: ['Michelangelo', 'Leonardo da Vinci', 'Raphael', 'Donatello'], answer: 1 },
      { q: 'Which art movement features bold colors and geometric shapes?', options: ['Impressionism', 'Cubism', 'Surrealism', 'Baroque'], answer: 1 },
      { q: 'What is the technique of painting with water-based paints called?', options: ['Oil painting', 'Acrylic', 'Watercolor', 'Fresco'], answer: 2 },
      { q: 'Who painted "The Starry Night"?', options: ['Picasso', 'Van Gogh', 'Monet', 'Dali'], answer: 1 },
      { q: 'What is a self-portrait?', options: ['Painting of a friend', 'Painting of yourself', 'Painting of nature', 'Abstract art'], answer: 1 },
      { q: 'Which medium uses pigment mixed with egg yolk?', options: ['Oil', 'Acrylic', 'Tempera', 'Watercolor'], answer: 2 },
      { q: 'What is the art of paper folding called?', options: ['Origami', 'Kirigami', 'Papier-mâché', 'Collage'], answer: 0 },
      { q: 'Who created "The Persistence of Memory" with melting clocks?', options: ['Magritte', 'Dalí', 'Ernst', 'Miro'], answer: 1 },
      { q: 'What is a sculpture in the round?', options: ['2D sculpture', '3D sculpture', 'Relief', 'Installation'], answer: 1 },
      { q: 'Which Renaissance artist painted the Sistine Chapel ceiling?', options: ['Da Vinci', 'Raphael', 'Michelangelo', 'Botticelli'], answer: 2 }
    ];
    
    gameState = {
      questions: questions.sort(() => Math.random() - 0.5).slice(0, 5),
      currentQuestion: 0,
      score: 0,
      timeLeft: 30
    };
    
    renderQuizGame();
  }
  
  // Render quiz game
  function renderQuizGame() {
    const container = document.getElementById('gameArea');
    if (!container) return;
    
    const state = gameState;
    const question = state.questions[state.currentQuestion];
    
    if (!question) {
      endGame('art_quiz', state.score);
      return;
    }
    
    container.innerHTML = `
      <div class="quiz-game">
        <div class="quiz-header">
          <span>Question ${state.currentQuestion + 1}/${state.questions.length}</span>
          <span class="quiz-score">Score: ${state.score}</span>
        </div>
        <h3>${question.q}</h3>
        <div class="quiz-options">
          ${question.options.map((opt, i) => `
            <button class="quiz-option" onclick="GamesModule.answerQuiz(${i})">${opt}</button>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Answer quiz
  function answerQuiz(selectedIndex) {
    const question = gameState.questions[gameState.currentQuestion];
    
    if (selectedIndex === question.answer) {
      gameState.score += 10;
      showFeedback(true);
    } else {
      showFeedback(false);
    }
    
    gameState.currentQuestion++;
    
    setTimeout(() => {
      renderQuizGame();
    }, 500);
  }
  
  // Show feedback
  function showFeedback(correct) {
    const container = document.getElementById('gameArea');
    if (!container) return;
    
    container.innerHTML += `
      <div class="quiz-feedback ${correct ? 'correct' : 'wrong'}">
        <i class="fas ${correct ? 'fa-check' : 'fa-times'}"></i>
        ${correct ? 'Correct!' : 'Wrong!'}
      </div>
    `;
  }
  
  // Color Match Game
  function startColorMatch() {
    const targetColor = randomColor();
    const colorOptions = [targetColor, randomColor(), randomColor(), randomColor()].sort(() => Math.random() - 0.5);
    
    gameState = {
      targetColor,
      colorOptions,
      score: 0,
      rounds: 10,
      currentRound: 0
    };
    
    renderColorMatchGame();
  }
  
  // Render color match game
  function renderColorMatchGame() {
    const container = document.getElementById('gameArea');
    if (!container) return;
    
    const state = gameState;
    
    if (state.currentRound >= state.rounds) {
      endGame('color_match', state.score);
      return;
    }
    
    container.innerHTML = `
      <div class="color-game">
        <div class="color-header">
          <span>Round ${state.currentRound + 1}/${state.rounds}</span>
          <span class="color-score">Score: ${state.score}</span>
        </div>
        <div class="color-target">
          <p>Match this color:</p>
          <div class="color-box" style="background:${state.targetColor}"></div>
        </div>
        <div class="color-options">
          ${state.colorOptions.map((color, i) => `
            <button class="color-option" style="background:${color}" 
                    onclick="GamesModule.answerColorMatch('${color}')"></button>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Answer color match
  function answerColorMatch(selectedColor) {
    if (selectedColor === gameState.targetColor) {
      gameState.score += 20;
    }
    
    gameState.currentRound++;
    
    // Next round
    const targetColor = randomColor();
    const colorOptions = [targetColor, randomColor(), randomColor(), randomColor()].sort(() => Math.random() - 0.5);
    
    gameState.targetColor = targetColor;
    gameState.colorOptions = colorOptions;
    
    renderColorMatchGame();
  }
  
  // Random color generator
  function randomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  
  // Sketch Challenge
  function startSketchChallenge() {
    const prompts = ['Cat', 'Dog', 'Sunset', 'Flower', 'House', 'Tree', 'Car', 'Bird', 'Fish', 'Star'];
    
    gameState = {
      currentPrompt: prompts[Math.floor(Math.random() * prompts.length)],
      timeLeft: 60,
      score: 0
    };
    
    renderSketchChallenge();
    startTimer();
  }
  
  // Render sketch challenge
  function renderSketchChallenge() {
    const container = document.getElementById('gameArea');
    if (!container) return;
    
    container.innerHTML = `
      <div class="sketch-game">
        <div class="sketch-header">
          <span>Draw: <strong>${gameState.currentPrompt}</strong></span>
          <span class="sketch-timer">Time: ${gameState.timeLeft}s</span>
        </div>
        <canvas id="sketchCanvas" width="400" height="300"></canvas>
        <div class="sketch-controls">
          <button onclick="GamesModule.clearCanvas()"><i class="fas fa-eraser"></i> Clear</button>
          <button onclick="GamesModule.submitSketch()" class="submit-btn">
            <i class="fas fa-check"></i> Submit
          </button>
        </div>
      </div>
    `;
    
    initCanvas();
  }
  
  // Initialize canvas
  function initCanvas() {
    const canvas = document.getElementById('sketchCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let drawing = false;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    canvas.addEventListener('mousedown', (e) => {
      drawing = true;
      ctx.beginPath();
      ctx.moveTo(e.offsetX, e.offsetY);
    });
    
    canvas.addEventListener('mousemove', (e) => {
      if (drawing) {
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
      }
    });
    
    canvas.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('mouseout', () => drawing = false);
  }
  
  // Clear canvas
  function clearCanvas() {
    const canvas = document.getElementById('sketchCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  // Submit sketch
  function submitSketch() {
    clearInterval(gameState.timer);
    // Award points for participation
    gameState.score = 50;
    endGame('sketch_challenge', gameState.score);
  }
  
  // Start timer
  function startTimer() {
    gameState.timer = setInterval(() => {
      gameState.timeLeft--;
      
      const timerEl = document.querySelector('.sketch-timer');
      if (timerEl) {
        timerEl.textContent = `Time: ${gameState.timeLeft}s`;
      }
      
      if (gameState.timeLeft <= 0) {
        clearInterval(gameState.timer);
        submitSketch();
      }
    }, 1000);
  }
  
  // Word Puzzle Game
  function startWordPuzzle() {
    const words = [
      { word: 'CANVAS', hint: 'Artists paint on this' },
      { word: 'BRUSH', hint: 'Tool for applying paint' },
      { word: 'PALETTE', hint: 'Mix colors here' },
      { word: 'PORTRAIT', hint: 'Artwork of a person' },
      { word: 'LANDSCAPE', hint: 'Nature scenery' },
      { word: 'SCULPTURE', hint: '3D art form' },
      { word: 'MUSEUM', hint: 'Art is displayed here' },
      { word: 'GALLERY', hint: 'Art exhibition space' }
    ];
    
    const selected = words[Math.floor(Math.random() * words.length)];
    const scrambled = selected.word.split('').sort(() => Math.random() - 0.5).join('');
    
    gameState = {
      word: selected.word,
      hint: selected.hint,
      scrambled,
      attempts: 3,
      score: 0
    };
    
    renderWordPuzzle();
  }
  
  // Render word puzzle
  function renderWordPuzzle() {
    const container = document.getElementById('gameArea');
    if (!container) return;
    
    container.innerHTML = `
      <div class="word-game">
        <div class="word-header">
          <span>Attempts: ${gameState.attempts}</span>
          <span class="word-score">Score: ${gameState.score}</span>
        </div>
        <p class="word-hint">Hint: ${gameState.hint}</p>
        <div class="word-scrambled">
          ${gameState.scrarmed.split('').map(letter => `<span>${letter}</span>`).join('')}
        </div>
        <input type="text" id="wordAnswer" placeholder="Unscramble the word" maxlength="10">
        <button onclick="GamesModule.checkWord()" class="submit-btn">
          <i class="fas fa-check"></i> Submit
        </button>
      </div>
    `;
  }
  
  // Check word
  function checkWord() {
    const answer = document.getElementById('wordAnswer').value.toUpperCase();
    
    if (answer === gameState.word) {
      gameState.score = 100;
      endGame('word_puzzle', gameState.score);
    } else {
      gameState.attempts--;
      
      if (gameState.attempts <= 0) {
        endGame('word_puzzle', gameState.score);
      } else {
        showFeedback(false);
        setTimeout(() => {
          document.getElementById('wordAnswer').value = '';
        }, 500);
      }
    }
  }
  
  // End game
  async function endGame(gameId, score) {
    const container = document.getElementById('gameArea');
    if (!container) return;
    
    const highScore = gameScores[gameId]?.highScore || 0;
    const isNewHighScore = score > highScore;
    
    container.innerHTML = `
      <div class="game-over">
        <h2><i class="fas fa-trophy"></i> Game Over!</h2>
        <div class="final-score">
          <p>Your Score: <strong>${score}</strong></p>
          ${isNewHighScore ? '<p class="new-high">🎉 New High Score! 🎉</p>' : `<p>High Score: ${highScore}</p>`}
        </div>
        <div class="game-over-actions">
          <button onclick="GamesModule.startGame('${gameId}')" class="btn-primary">
            <i class="fas fa-redo"></i> Play Again
          </button>
          <button onclick="GamesModule.showGamesHub()" class="btn-secondary">
            <i class="fas fa-home"></i> Back to Games
          </button>
        </div>
      </div>
    `;
    
    // Save score
    if (window.currentUser) {
      await saveScore(gameId, score, isNewHighScore);
    }
  }
  
  // Save score
  async function saveScore(gameId, score, isNewHigh) {
    try {
      const { db } = window.firebaseServices;
      
      const existing = gameScores[gameId];
      
      if (existing) {
        await db.collection('games').doc(existing.id).update({
          highScore: isNewHigh ? score : existing.highScore,
          totalPlays: existing.totalPlays + 1,
          lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await db.collection('games').add({
          userId: window.currentUser.uid,
          gameId: gameId,
          highScore: score,
          totalPlays: 1,
          lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      gameScores[gameId] = { highScore: score, totalPlays: (existing?.totalPlays || 0) + 1 };
    } catch (error) {
      console.error('Error saving score:', error);
    }
  }
  
  // Public API
  return {
    GAMES,
    init,
    loadScores,
    showGamesHub,
    startGame,
    answerQuiz,
    answerColorMatch,
    clearCanvas,
    submitSketch,
    checkWord,
    endGame,
    saveScore
  };
})();

window.GamesModule = GamesModule;