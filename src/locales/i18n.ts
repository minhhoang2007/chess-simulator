import { BotProfile, Language } from '../types/chess';

export const BOT_PROFILES: BotProfile[] = [
  {
    id: 'bot_600',
    elo: 600,
    name: {
      vi: 'Bé Tập Chơi (Tí)',
      en: 'Pawn Cadet (Tim)'
    },
    title: {
      vi: 'Tân Thủ Cờ Vua',
      en: 'Chess Beginner'
    },
    description: {
      vi: 'Vừa học xong luật cờ vua hôm qua. Hay đi sót quân và chưa biết phòng thủ.',
      en: 'Just learned the rules yesterday. Often leaves pieces hanging and ignores defense.'
    },
    avatar: '🧒',
    skillLevel: 0,
    depth: 2,
    blunderRate: 0.35,
    personality: {
      vi: 'Ủa sao con Hậu lại đi chéo được vậy ta?',
      en: 'Wait, does the Queen move diagonally like that?'
    }
  },
  {
    id: 'bot_900',
    elo: 900,
    name: {
      vi: 'Kỳ Thủ Trường Học (Huy)',
      en: 'School Champion (Leo)'
    },
    title: {
      vi: 'Học Viên Tập Sự',
      en: 'Apprentice Player'
    },
    description: {
      vi: 'Đã biết bắt quân có lợi và nhập thành, nhưng hay dính các đòn chiến thuật cơ bản.',
      en: 'Understands material trade and castling, but still vulnerable to simple tactics.'
    },
    avatar: '👦',
    skillLevel: 3,
    depth: 4,
    blunderRate: 0.2,
    personality: {
      vi: 'Tôi vừa học đòn bắt đôi mã, cẩn thận nhé!',
      en: 'I just practiced knight forks, watch your pieces!'
    }
  },
  {
    id: 'bot_1200',
    elo: 1200,
    name: {
      vi: 'Phong Trào Quán Cà Phê (Bác Nam)',
      en: 'Coffeehouse Hustler (Victor)'
    },
    title: {
      vi: 'Kỳ Thủ Phong Trào',
      en: 'Club Casual'
    },
    description: {
      vi: 'Nhiều năm kinh nghiệm chơi cờ giải trí. Khai cuộc bài bản, chiến thuật sắc sảo.',
      en: 'Years of informal play. Solid opening principles and alert tactical instincts.'
    },
    avatar: '🧔',
    skillLevel: 7,
    depth: 6,
    blunderRate: 0.08,
    personality: {
      vi: 'Một ly cà phê và một ván cờ, xem ai chiếu ai trước nào!',
      en: 'A good brew and a solid board, let the best moves win!'
    }
  },
  {
    id: 'bot_1500',
    elo: 1500,
    name: {
      vi: 'Chiến Lược Gia (Lan Anh)',
      en: 'Tactical Analyst (Elena)'
    },
    title: {
      vi: 'Kỳ Thủ Bán Chuyên',
      en: 'Intermediate Tactician'
    },
    description: {
      vi: 'Thành thạo cấu trúc tốt, chiếm lĩnh trung tâm và tính toán 3-5 nước đi phía trước.',
      en: 'Masters pawn structures, open files, and calculates combinations 3-5 moves ahead.'
    },
    avatar: '👩‍💼',
    skillLevel: 11,
    depth: 9,
    blunderRate: 0.02,
    personality: {
      vi: 'Mọi sơ hở ở hàng tốt của bạn đều đã nằm trong tính toán.',
      en: 'Every weakness in your pawn shield has been factored in.'
    }
  },
  {
    id: 'bot_1800',
    elo: 1800,
    name: {
      vi: 'Kiện Tướng Đội Tuyển (Hoàng)',
      en: 'State Contender (Marcus)'
    },
    title: {
      vi: 'Cao Thủ Tuyển Tỉnh',
      en: 'Advanced Candidate'
    },
    description: {
      vi: 'Đạt thứ hạng cao ở các giải mở rộng. Tấn công vị trí vua đối phương tàn nhẫn.',
      en: 'Tournament medalist. Unforgiving king hunt and precise positional squeeze.'
    },
    avatar: '🧙‍♂️',
    skillLevel: 15,
    depth: 13,
    blunderRate: 0.0,
    personality: {
      vi: 'Cờ vua là một môn khoa học chính xác. Đừng để lộ sơ hở.',
      en: 'Chess is an exact science. Flaws are punished immediately.'
    }
  },
  {
    id: 'bot_2200',
    elo: 2200,
    name: {
      vi: 'Đại Sư Stockfish (AI Thần Cờ)',
      en: 'Stockfish Master (Grandmaster AI)'
    },
    title: {
      vi: 'Kiện Tướng Quốc Tế FIDE',
      en: 'FIDE Master Engine'
    },
    description: {
      vi: 'Sức mạnh tối thượng của thuật toán Stockfish mở rộng. Tính toán hàng triệu nước cờ.',
      en: 'Full power of Stockfish engine. Evaluates millions of variations with cold precision.'
    },
    avatar: '🤖',
    skillLevel: 20,
    depth: 18,
    blunderRate: 0.0,
    personality: {
      vi: 'Thuật toán đã thấy kết quả sau 20 nước nữa. Chúc bạn may mắn.',
      en: 'Depth calculation complete. Best of luck in the labyrinth.'
    }
  }
];

export const TRANSLATIONS = {
  vi: {
    appTitle: 'LIQUID GLASS CHESS 3D',
    appSubtitle: 'CỜ VUA THỦY TINH LỎNG • STOCKFISH AI',
    selectBot: 'CHỌN ĐỐI THỦ MÁY (BOT)',
    elo: 'Elo',
    difficulty: 'Cấp độ',
    playAsWhite: 'Cầm quân Trắng (Đi trước)',
    playAsBlack: 'Cầm quân Đen (Đi sau)',
    startGame: 'Bắt Đầu Ván Đấu',
    newGame: 'Ván Cờ Mới',
    resign: 'Đầu Hàng',
    undo: 'Đi Lại (Undo)',
    hint: 'Gợi Ý Nước Đi',
    flipBoard: 'Xoay Bàn Cờ',
    cameraPresets: 'Góc Nhìn Camera',
    viewPerspective: '3D Nghệ Thuật (Gốc)',
    viewTopdown: '2D Nhìn Thẳng (Top-Down)',
    viewWhite: 'Góc Cầm Trắng',
    viewBlack: 'Góc Cầm Đen',
    autoRotate: 'Tự xoay theo lượt',
    sound: 'Âm thanh hiệu ứng',
    coordinates: 'Ký hiệu tọa độ A-H / 1-8',
    pieceTheme: 'Chất liệu quân cờ',
    boardTheme: 'Chất liệu bàn cờ',
    liquidGlass: 'Thủy Tinh Lỏng (Liquid Glass)',
    classicWood: 'Gỗ Tự Nhiên Cổ Điển',
    emeraldJade: 'Ngọc Bích Hoàng Gia',
    cyberNeon: 'Kính Neon Dạ Quang',
    rusticWood: 'Gỗ Mộc Cổ Điển (Như Ảnh)',
    obsidianMarble: 'Đá Cẩm Thạch & Hắc Diệp',
    tournamentBlue: 'Xanh Thi Đấu FIDE',
    timeControl: 'Thời Gian Ván Đấu',
    unlimitedTime: 'Không giới hạn thời gian',
    bullet1m: '1 phút (Siêu chớp Bullet)',
    blitz3m: '3 phút (Chớp Blitz)',
    blitz5m: '5 phút (Chớp Blitz)',
    rapid10m: '10 phút (Nhanh Rapid)',
    yourTurn: 'LƯỢT CỦA BẠN',
    botTurn: 'LƯỢT CỦA BOT',
    thinking: 'Stockfish đang tính toán...',
    check: 'CHIẾU TƯỚNG!',
    checkmate: 'CHIẾU HẾT!',
    drawStalemate: 'Hòa do Hết nước đi (Pát / Stalemate)',
    drawRepetition: 'Hòa do Lặp lại 3 lần',
    drawMaterial: 'Hòa do Không đủ lực lượng chiếu hết',
    draw50Moves: 'Hòa do Quy tắc 50 nước không ăn quân',
    youWon: 'XUẤT SẮC! BẠN ĐÃ CHIẾN THẮNG!',
    youLost: 'MÁY ĐÃ CHIẾN THẮNG!',
    gameDraw: 'TRẬN ĐẤU KẾT THÚC HÒA!',
    resignConfirmTitle: 'Xác nhận đầu hàng?',
    resignConfirmMsg: 'Bạn có chắc chắn muốn chịu thua ván cờ này không?',
    confirmYes: 'Chấp Nhận Đầu Hàng',
    confirmCancel: 'Tiếp Tục Chơi',
    promoteTitle: 'PHONG CẤP TỐT (PROMOTION)',
    promoteSubtitle: 'Chọn quân cờ bạn muốn biến hóa thành:',
    queen: 'Hậu (Queen)',
    rook: 'Xe (Rook)',
    bishop: 'Tượng (Bishop)',
    knight: 'Mã (Knight)',
    capturedWhite: 'Quân Trắng đã ăn:',
    capturedBlack: 'Quân Đen đã ăn:',
    advantage: 'Lợi thế',
    evalEqual: 'Thế cờ cân bằng (0.0)',
    evalWhite: 'Trắng chiếm ưu thế (+{val})',
    evalBlack: 'Đen chiếm ưu thế (-{val})',
    evalMate: 'Chiếu hết trong {val} nước!',
    moveHistory: 'Lịch sử nước đi',
    whitePlayer: 'Người chơi (Trắng)',
    blackPlayer: 'Máy Stockfish (Đen)',
    hintText: 'Nước đi đề xuất: {from} ➔ {to}',
    githubReady: 'Đã sẵn sàng tải lên GitHub minhhoang2007',
    githubRepo: 'Kho lưu trữ GitHub',
    settings: 'Cài Đặt & Giao Diện',
    close: 'Đóng',
    restartMatch: 'Đấu Lại',
    changeBot: 'Đổi Đối Thủ',
    evalBarTooltip: 'Thanh đánh giá thực tế của Stockfish Engine'
  },
  en: {
    appTitle: 'LIQUID GLASS CHESS 3D',
    appSubtitle: 'REALISTIC GLASS CHESS • POWERED BY STOCKFISH AI',
    selectBot: 'SELECT AI OPPONENT',
    elo: 'Elo',
    difficulty: 'Level',
    playAsWhite: 'Play as White (First move)',
    playAsBlack: 'Play as Black (Second move)',
    startGame: 'Start Game',
    newGame: 'New Game',
    resign: 'Resign',
    undo: 'Undo Move',
    hint: 'Get Best Move Hint',
    flipBoard: 'Flip Board',
    cameraPresets: 'Camera Presets',
    viewPerspective: '3D Perspective (Photo angle)',
    viewTopdown: '2D Top-Down View',
    viewWhite: 'White Side View',
    viewBlack: 'Black Side View',
    autoRotate: 'Auto-rotate on turn',
    sound: 'Sound Effects',
    coordinates: 'Board Coordinates A-H / 1-8',
    pieceTheme: 'Chess Piece Material',
    boardTheme: 'Board Material',
    liquidGlass: 'Realistic Liquid Glass',
    classicWood: 'Classic Polished Wood',
    emeraldJade: 'Royal Emerald Jade',
    cyberNeon: 'Cyber Neon Glass',
    rusticWood: 'Rustic Wood Desk (Like Photo)',
    obsidianMarble: 'Obsidian & Marble',
    tournamentBlue: 'FIDE Tournament Blue',
    timeControl: 'Time Control',
    unlimitedTime: 'Unlimited Time',
    bullet1m: '1 min (Bullet)',
    blitz3m: '3 min (Blitz)',
    blitz5m: '5 min (Blitz)',
    rapid10m: '10 min (Rapid)',
    yourTurn: 'YOUR TURN',
    botTurn: "STOCKFISH'S TURN",
    thinking: 'Stockfish is calculating...',
    check: 'CHECK!',
    checkmate: 'CHECKMATE!',
    drawStalemate: 'Draw by Stalemate',
    drawRepetition: 'Draw by Threefold Repetition',
    drawMaterial: 'Draw by Insufficient Material',
    draw50Moves: 'Draw by 50-Move Rule',
    youWon: 'BRILLIANT! YOU WON!',
    youLost: 'STOCKFISH WON!',
    gameDraw: 'GAME DRAWN!',
    resignConfirmTitle: 'Confirm Resignation?',
    resignConfirmMsg: 'Are you sure you want to resign this game?',
    confirmYes: 'Yes, Resign',
    confirmCancel: 'Continue Playing',
    promoteTitle: 'PAWN PROMOTION',
    promoteSubtitle: 'Choose the piece to promote to:',
    queen: 'Queen',
    rook: 'Rook',
    bishop: 'Bishop',
    knight: 'Knight',
    capturedWhite: 'White captures:',
    capturedBlack: 'Black captures:',
    advantage: 'Advantage',
    evalEqual: 'Position is equal (0.0)',
    evalWhite: 'White is winning (+{val})',
    evalBlack: 'Black is winning (-{val})',
    evalMate: 'Forced mate in {val} moves!',
    moveHistory: 'Move Notation',
    whitePlayer: 'Player (White)',
    blackPlayer: 'Stockfish AI (Black)',
    hintText: 'Engine recommended move: {from} ➔ {to}',
    githubReady: 'Ready for GitHub minhhoang2007',
    githubRepo: 'GitHub Repository',
    settings: 'Settings & Visuals',
    close: 'Close',
    restartMatch: 'Rematch',
    changeBot: 'Change Opponent',
    evalBarTooltip: 'Live Stockfish Engine Position Evaluation'
  }
};
