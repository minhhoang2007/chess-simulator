import { BotProfile } from '../types/chess';

export const CHESS_COM_BOTS: BotProfile[] = [
  {
    id: 'jimmy',
    name: 'Jimmy',
    elo: 600,
    category: 'beginner',
    avatar: '/arya/waving/01.png',
    avatarBg: '#3b82f6',
    personalityTag: 'Beginner',
    quote: {
      vi: "Hi! Let's play a chill game of chess.",
      en: "Hi! Let's play a chill game of chess."
    },
    description: {
      vi: 'Friendly beginner bot. Plays casual moves and occasionally leaves pieces undefended.',
      en: 'Friendly beginner bot. Plays casual moves and occasionally leaves pieces undefended.'
    },
    skillLevel: 0,
    depth: 2,
    blunderRate: 0.35
  },
  {
    id: 'zara',
    name: 'Zara',
    elo: 850,
    category: 'beginner',
    avatar: '/arya/idle/00.png',
    avatarBg: '#ec4899',
    personalityTag: 'Casual',
    quote: {
      vi: 'I like developing pieces and looking for quick attacks!',
      en: 'I like developing pieces and looking for quick attacks!'
    },
    description: {
      vi: 'Active novice player who loves open positions and early tactical exchanges.',
      en: 'Active novice player who loves open positions and early tactical exchanges.'
    },
    skillLevel: 3,
    depth: 4,
    blunderRate: 0.20
  },
  {
    id: 'nelson',
    name: 'Nelson',
    elo: 1300,
    category: 'intermediate',
    avatar: '/arya/review/02.png',
    avatarBg: '#f59e0b',
    personalityTag: 'Aggressive',
    quote: {
      vi: 'Watch out for my early Queen attacks!',
      en: 'Watch out for my early Queen attacks!'
    },
    description: {
      vi: 'Brings the Queen out early and hunts for aggressive tactical traps.',
      en: 'Brings the Queen out early and hunts for aggressive tactical traps.'
    },
    skillLevel: 8,
    depth: 6,
    blunderRate: 0.06
  },
  {
    id: 'antonio',
    name: 'Arya',
    elo: 1500,
    category: 'intermediate',
    avatar: '/arya/jumping/02.png',
    avatarBg: '#10b981',
    personalityTag: 'Balanced',
    quote: {
      vi: "Let's see if you can outplay my positional setup!",
      en: "Let's see if you can outplay my positional setup!"
    },
    description: {
      vi: 'Plays clean, principled openings with solid central control and sharp tactics.',
      en: 'Plays clean, principled openings with solid central control and sharp tactics.'
    },
    skillLevel: 11,
    depth: 9,
    blunderRate: 0.02
  },
  {
    id: 'wally',
    name: 'Wally',
    elo: 1800,
    category: 'advanced',
    avatar: '/arya/waiting/02.png',
    avatarBg: '#8b5cf6',
    personalityTag: 'Advanced',
    quote: {
      vi: 'Every move has a strategic purpose. Prepare for the endgame.',
      en: 'Every move has a strategic purpose. Prepare for the endgame.'
    },
    description: {
      vi: 'Strong club-level tactician with deep calculation and accurate endgame play.',
      en: 'Strong club-level tactician with deep calculation and accurate endgame play.'
    },
    skillLevel: 15,
    depth: 11,
    blunderRate: 0.0
  },
  {
    id: 'francis',
    name: 'Francis',
    elo: 2200,
    category: 'master',
    avatar: '/arya/review/04.png',
    avatarBg: '#ef4444',
    personalityTag: 'Master',
    quote: {
      vi: 'Master-level precision. No tactical mistakes forgiven.',
      en: 'Master-level precision. No tactical mistakes forgiven.'
    },
    description: {
      vi: 'FIDE Master strength powered by Stockfish. Unforgiving in both tactics and endgames.',
      en: 'FIDE Master strength powered by Stockfish. Unforgiving in both tactics and endgames.'
    },
    skillLevel: 20,
    depth: 14,
    blunderRate: 0.0
  }
];

const EN_STRINGS = {
  appTitle: 'Chess',
  appSubtitle: 'Play vs Bot',
  menu: 'Menu',
  newGame: 'New Game',
  restartMatch: 'Rematch',
  changeBot: 'Choose Bot',
  resign: 'Resign',
  undo: 'Undo',
  hint: 'Hint',
  flipBoard: 'Flip Board',
  cameraTilt: 'Board View',
  viewPhoto: '3D Cafe Perspective',
  viewTopdown: '2D Top-Down',
  viewFree3d: 'Free 3D',
  theme: 'Appearance',
  pieceTheme: 'Pieces',
  boardTheme: 'Board',
  classicWood: 'Classic Wood',
  liquidGlass: 'Liquid Glass',
  emeraldJade: 'Emerald Jade',
  cyberNeon: 'Neon Glass',
  rusticWood: 'Walnut & Maple',
  obsidianMarble: 'Slate Marble',
  tournamentBlue: 'Tournament Blue',
  sound: 'Move Sounds',
  coordinates: 'Coordinates',
  showEval: 'Evaluation Bar',
  timeControl: 'Time Control',
  unlimitedTime: 'No Clock',
  bullet1m: '1 min',
  blitz3m: '3 min',
  blitz5m: '5 min',
  rapid10m: '10 min',
  whiteMove: 'White to move',
  blackMove: 'Black to move',
  whitesMoveText: '{num}. White to move',
  blacksMoveText: '{num}. Black to move',
  yourTurn: 'Your turn',
  botTurn: "Bot's turn",
  botThinking: 'Thinking...',
  check: 'Check',
  checkmate: 'Checkmate',
  drawStalemate: 'Draw by Stalemate',
  drawRepetition: 'Draw by Repetition',
  drawMaterial: 'Draw by Insufficient Material',
  draw50Moves: 'Draw by 50-Move Rule',
  youWon: 'You Won!',
  youLost: 'Bot Won',
  gameDraw: 'Draw',
  playAsWhite: 'White',
  playAsBlack: 'Black',
  selectBotTitle: 'Play vs Bot',
  startGame: 'Play',
  close: 'Close',
  confirmResignTitle: 'Resign Game?',
  confirmResignMsg: 'Are you sure you want to resign this game?',
  confirmYes: 'Resign',
  confirmNo: 'Cancel',
  promoteTitle: 'Promote Pawn',
  queen: 'Queen',
  rook: 'Rook',
  bishop: 'Bishop',
  knight: 'Knight',
  history: 'Moves',
  hintMessage: 'Best move: {move}'
};

export const TRANSLATIONS = {
  vi: EN_STRINGS,
  en: EN_STRINGS
};
