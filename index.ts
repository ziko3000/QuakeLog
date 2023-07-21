import fs from 'fs';

/**
 * @typedef {object} GameData - Structure to hold information for each game
 * @property {number} total_kills - Total kills in the game
 * @property {string[]} players - List of players in the game
 * @property {object} kills - Kill count of each player
 * @property {object} kills_by_means - Kills by each weapon type
 * @property {string[]} player_ranking - Players sorted by kill count
 */
interface GameData {
  total_kills: number;
  players: string[];
  kills: Record<string, number>;
  kills_by_means: Record<string, number>;
  player_ranking: string[];
}

/**
 * Default game data
 */
const defaultGameData: GameData = {
  total_kills: 0,
  players: [],
  kills: {},
  kills_by_means: {},
  player_ranking: [],
};

/**
 * @class QuakeLogParser - Class for parsing quake logs
 */
class QuakeLogParser {
  gameCount = 1;  // count of games, initialized with 1

  /**
   * Parses each line of the log
   * @param {string} line - Each line of the log
   * @param {GameData} currentGame - Current game data
   * @returns {GameData} - Updated game data
   */
  parseLine(line: string, currentGame: GameData): GameData {
    try {
      if (line.includes('InitGame')) {
        this.gameCount++;
        return defaultGameData;
      }

      const isClientChange = line.includes('ClientUserinfoChanged');
      const isKill = line.includes('Kill');

      const newGame = { ...currentGame };

      if (isClientChange) {
        const playerName = line.split('n\\')[1].split('\\t')[0];
        newGame.players = [...new Set([...currentGame.players, playerName])];
      }

      if (isKill) {
        const deathCause = line.split('by ')[1];
        const killedPlayer = line.split('killed ')[1].split(' by')[0];

        newGame.total_kills++;
        newGame.kills_by_means = { ...currentGame.kills_by_means, [deathCause]: (currentGame.kills_by_means[deathCause] || 0) + 1 };
        newGame.kills = { ...currentGame.kills, [killedPlayer]: (currentGame.kills[killedPlayer] || 0) + 1 };
        newGame.player_ranking = Object.entries(newGame.kills)
          .sort(([, a], [, b]) => b - a)
          .map(([player]) => player);
      }

      return newGame;
    } catch (err: any) {
      console.error(`Failed to parse log line. Error: ${err.message}`);
      return currentGame;
    }
  }

  /**
   * Parses the whole log file and generates game data for each game
   * @param {string} filename - Name of the log file
   * @returns {object} - An object with game data for each game
   */
  parseLogFile(filename: string): Record<string, GameData> {
    try {
      const lines = fs.readFileSync(filename, 'utf8').split('\n');
      return lines.reduce((games, line) => {
        const gameKey = `game_${this.gameCount}`;
        const currentGame = games[gameKey] || defaultGameData;
        const newGame = this.parseLine(line, currentGame);
        return { ...games, [gameKey]: newGame };
      }, {} as Record<string, GameData>);
    } catch (err: any) {
      console.error(`Failed to parse log file. Error: ${err.message}`);
      return {};
    }
  }

  /**
   * Generates a report for each game in the console
   * @param {object} games - An object with game data for each game
   */
  generateMatchReports(games: Record<string, GameData>): void {
    try {
      console.log(JSON.stringify(games, null, 2));
    } catch (err: any) {
      console.error(`Failed to generate match reports. Error: ${err.message}`);
    }
  }

  /**
   * Parses the log file and generates reports
   * @param {string} filename - Name of the log file
   */
  parseAndReport(filename: string): void {
    try {
      const games = this.parseLogFile(filename);
      this.generateMatchReports(games);
    } catch (err: any) {
      console.error(`Failed to parse log file and generate reports. Error: ${err.message}`);
    }
  }
}

/**
 * Create a new instance of QuakeLogParser and parse a log file
 */
const parser = new QuakeLogParser();
parser.parseAndReport('qgames.log');
