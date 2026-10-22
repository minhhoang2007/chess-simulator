import { BotProfile } from '../types/chess';

export const CHESS_COM_BOTS: BotProfile[] = [
  {
    id: 'maria',
    name: 'Maria',
    elo: 1000,
    eloDisplay: '1000',
    category: 'beginner',
    avatar: `${import.meta.env.BASE_URL}bots/maria.png`,
    avatarBg: '#3b82f6',
    personalityTag: 'Club Novice',
    quote: {
      en: "Hola! I've been practicing my tactics. Let's have a great game!"
    },
    description: {
      en: 'Solid 1000-ELO club newcomer. Develops pieces actively but can miss multi-move combinations.'
    },
    skillLevel: 3,
    depth: 4,
    blunderRate: 0.16
  },
  {
    id: 'sven',
    name: 'Sven',
    elo: 1100,
    eloDisplay: '1100',
    category: 'beginner',
    avatar: `${import.meta.env.BASE_URL}bots/sven.png`,
    avatarBg: '#06b6d4',
    personalityTag: 'Defensive',
    quote: {
      en: "Zdravo! Just don't take any of my pieces, OK?"
    },
    description: {
      en: 'Sven hates losing pieces and likes to play defensively. Can you break through his solid shell?'
    },
    skillLevel: 5,
    depth: 5,
    blunderRate: 0.10
  },
  {
    id: 'emir',
    name: 'Emir',
    elo: 1200,
    eloDisplay: '1200',
    category: 'intermediate',
    avatar: `${import.meta.env.BASE_URL}bots/emir.png`,
    avatarBg: '#14b8a6',
    personalityTag: 'Tactical',
    quote: {
      en: "Selam! My kids think I'm a Grandmaster — don't tell them otherwise!"
    },
    description: {
      en: 'Emir taught his kids how to play chess and plays a steady, principled intermediate game.'
    },
    skillLevel: 6,
    depth: 6,
    blunderRate: 0.06
  },
  {
    id: 'nelson',
    name: 'Nelson',
    elo: 1300,
    eloDisplay: '1300',
    category: 'intermediate',
    avatar: `${import.meta.env.BASE_URL}bots/nelson.png`,
    avatarBg: '#f59e0b',
    personalityTag: 'Queen Hunter',
    quote: {
      en: 'Molo! Watch out for my early Queen attacks! Your move!'
    },
    description: {
      en: 'Nelson knows that the Queen is the strongest piece and loves bringing her out early to punish mistakes.'
    },
    skillLevel: 8,
    depth: 7,
    blunderRate: 0.04
  },
  {
    id: 'antonio',
    name: 'Antonio',
    elo: 1500,
    eloDisplay: '1500',
    category: 'intermediate',
    avatar: `${import.meta.env.BASE_URL}bots/antonio.png`,
    avatarBg: '#10b981',
    personalityTag: 'Balanced',
    quote: {
      en: 'Balance is the key to success. Good luck!'
    },
    description: {
      en: 'Antonio prides himself on being a well-rounded positional player with strong central control.'
    },
    skillLevel: 10,
    depth: 9,
    blunderRate: 0.01
  },
  {
    id: 'isabel',
    name: 'Isabel',
    elo: 1600,
    eloDisplay: '1600',
    category: 'advanced',
    avatar: `${import.meta.env.BASE_URL}bots/isabel.png`,
    avatarBg: '#ec4899',
    personalityTag: 'Endgame Pro',
    quote: {
      en: "Buenas! I've been studying endgames with my Grandmaster coach."
    },
    description: {
      en: 'Isabel calculates cleanly and converts small advantages in the endgame with accuracy.'
    },
    skillLevel: 12,
    depth: 10,
    blunderRate: 0.0
  },
  {
    id: 'wally',
    name: 'Wally',
    elo: 1800,
    eloDisplay: '1800',
    category: 'advanced',
    avatar: `${import.meta.env.BASE_URL}bots/wally.png`,
    avatarBg: '#8b5cf6',
    personalityTag: 'Club Veteran',
    quote: {
      en: "Guid mornin. Let's sit back and enjoy a deep strategic game."
    },
    description: {
      en: 'Strong 1800 club tactician with deep calculation and rock-solid positional awareness.'
    },
    skillLevel: 14,
    depth: 11,
    blunderRate: 0.0
  },
  {
    id: 'li',
    name: 'Li',
    elo: 2000,
    eloDisplay: '2000',
    category: 'advanced',
    avatar: `${import.meta.env.BASE_URL}bots/li.png`,
    avatarBg: '#6366f1',
    personalityTag: 'Expert',
    quote: {
      en: 'Sharp calculation and disciplined defense. Show me your best lines!'
    },
    description: {
      en: '2000-rated Expert who punishes tactical inaccuracies immediately.'
    },
    skillLevel: 16,
    depth: 13,
    blunderRate: 0.0
  },
  {
    id: 'noam',
    name: 'Noam',
    elo: 2200,
    eloDisplay: '2200',
    category: 'master',
    avatar: `${import.meta.env.BASE_URL}bots/noam.png`,
    avatarBg: '#d97706',
    personalityTag: 'Master',
    quote: {
      en: "Shalom! I've played many legends over the decades. Let's give it a go."
    },
    description: {
      en: 'Veteran National Master with decades of tournament experience and deep endgame mastery.'
    },
    skillLevel: 18,
    depth: 14,
    blunderRate: 0.0
  },
  {
    id: 'gotham',
    name: 'GothamChess',
    elo: 2500,
    eloDisplay: '2500',
    category: 'master',
    avatar: `${import.meta.env.BASE_URL}bots/gotham.png`,
    avatarBg: '#eab308',
    personalityTag: 'THE ROOOOK!',
    quote: {
      en: 'And he sacrifices... THE ROOOOK!! Ready for some spicy chess?'
    },
    description: {
      en: 'International Master Levy Rozman. Dynamic, aggressive, and always hunting for brilliant sacrifices.'
    },
    skillLevel: 19,
    depth: 15,
    blunderRate: 0.0
  },
  {
    id: 'magnus',
    name: 'Magnus Carlsen',
    elo: 2882,
    eloDisplay: '2882',
    category: 'master',
    avatar: `${import.meta.env.BASE_URL}bots/magnus.png`,
    avatarBg: '#2563eb',
    personalityTag: 'GOAT • World #1',
    quote: {
      en: 'Sit down. Find the best moves, or get squeezed in the endgame.'
    },
    description: {
      en: '5-time World Chess Champion and highest-rated player in history (2882 peak). Relentless precision.'
    },
    skillLevel: 20,
    depth: 17,
    blunderRate: 0.0
  },
  {
    id: 'ayanokouji',
    name: 'Ayanokouji',
    elo: 3500,
    eloDisplay: '+∞',
    category: 'master',
    avatar: `${import.meta.env.BASE_URL}bots/ayanokouji.jpg`,
    avatarBg: '#dc2626',
    personalityTag: 'White Room • ∞',
    quote: {
      en: 'All pieces are merely tools. In the end, winning is everything.'
    },
    description: {
      en: 'Kiyotaka Ayanokouji (Classroom of the Elite). Unleashes 100% unthrottled maximum Stockfish engine calculation.'
    },
    skillLevel: 20,
    depth: 20,
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
  botThinking: 'Thinking',
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
  en: EN_STRINGS
};
