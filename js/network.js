let peer = null;
let conn = null;
let isHost = false;
let gameStarted = false;
let singlePlayerMode = false;

const hostBtn = document.getElementById('hostBtn');
const joinBtn = document.getElementById('joinBtn');
const singlePlayerBtn = document.getElementById('singlePlayerBtn');
const hostPanel = document.getElementById('hostPanel');
const joinPanel = document.getElementById('joinPanel');
const myIdSpan = document.getElementById('myId');
const remoteIdInput = document.getElementById('remoteIdInput');
const connectBtn = document.getElementById('connectBtn');
const statusEl = document.getElementById('status');
const startGameBtn = document.getElementById('startGameBtn');
const menu = document.getElementById('menu');
const gameUI = document.getElementById('gameUI');

singlePlayerBtn.addEventListener('click', () => {
    isHost = true;
    singlePlayerMode = true;
    startGame();
});

hostBtn.addEventListener('click', () => {
    isHost = true;
    hostBtn.style.display = 'none';
    joinBtn.style.display = 'none';
    hostPanel.style.display = 'block';
    
    peer = new Peer();
    
    peer.on('open', (id) => {
        myIdSpan.textContent = id;
        statusEl.textContent = 'Waiting for opponent...';
    });
    
    peer.on('connection', (connection) => {
        conn = connection;
        statusEl.textContent = 'Opponent connected!';
        startGameBtn.style.display = 'inline-block';
        setupConnection(conn);
    });
});

joinBtn.addEventListener('click', () => {
    isHost = false;
    hostBtn.style.display = 'none';
    joinBtn.style.display = 'none';
    joinPanel.style.display = 'block';
    
    peer = new Peer();
    
    peer.on('open', (id) => {
        statusEl.textContent = 'Your ID: ' + id + '. Enter host ID to connect.';
    });
});

connectBtn.addEventListener('click', () => {
    const remoteId = remoteIdInput.value;
    if (!remoteId) {
        statusEl.textContent = 'Please enter a host ID';
        return;
    }
    
    conn = peer.connect(remoteId);
    setupConnection(conn);
    statusEl.textContent = 'Connecting...';
});

function setupConnection(connection) {
    connection.on('open', () => {
        statusEl.textContent = 'Connected!';
        if (!isHost) {
            // Client will wait for host to start
        }
    });
    
    connection.on('data', (data) => {
        handleNetworkData(data);
    });
    
    connection.on('close', () => {
        statusEl.textContent = 'Disconnected';
    });
}

startGameBtn.addEventListener('click', () => {
    if (conn && conn.open) {
        const startData = { type: 'startGame', isHost: true };
        conn.send(startData);
        startGame();
    }
});

function handleNetworkData(data) {
    if (data.type === 'startGame') {
        startGame();
    } else if (data.type === 'spawnUnit') {
        if (typeof spawnUnitFromNetwork === 'function') {
            spawnUnitFromNetwork(data.unitType, data.position, data.side);
        }
    }
}

function sendNetworkData(data) {
    if (conn && conn.open) {
        conn.send(data);
    }
}

function startGame() {
    gameStarted = true;
    menu.style.display = 'none';
    gameUI.style.display = 'block';
    if (typeof initGame === 'function') {
        initGame(isHost);
    }
}
