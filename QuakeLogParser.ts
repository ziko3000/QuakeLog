import fs from 'fs';

/**
 * @typedef  {object} GameData - Structure to hold information for each game
 * @property {number} total_kills - Total kills in the game
 * @property {string[]} players - List of players in the game
 * @property {object} kills - Kill count of each player
 * @property {object} kills_by_means - Kills by each weapon type
 * @property {string[]} player_ranking - Players sorted by kill count
 */
interface GameData {
  total_kills:       number;
  players:           string[];
  kills:             Record<string, number>;
  kills_by_means:    Record<string, number>;
  player_ranking:    string[];
}

// Default game data

const defaultGameData: GameData = {
  total_kills:    0,
  players:        [],
  kills:          {},
  kills_by_means: {},
  player_ranking: [],
};

//@class QuakeLogParser - Class for parsing quake logs
class QuakeLogParser {
  private gameCount: number = 1; // count of games, initialized with 1

  /**
   * Parses each line of the log
   * @param   {string} line - Each line of the log
   * @param   {GameData} currentGame - Current game data
   * @returns {GameData} - Updated game data
   */
  parseLine(line: string, currentGame: GameData): GameData {
    try {
      // Check if the log line indicates a new game is starting
      if (line.includes('InitGame')) {
        this.gameCount++; // Increase the game count
        return defaultGameData; // Return the default game data for a new game
      }

      // Check if the log line contains information about a player change
      const isClientChange = line.includes('ClientUserinfoChanged');

      // Check if the log line contains information about a kill
      const isKill = line.includes('Kill');

      // Create a new game data object based on the current game data
      const newGame = { ...currentGame };

      // If the log line indicates a player change
      if (isClientChange) {
        // Extract the player name from the log line
        const playerName = line.split('n\\')[1].split('\\t')[0];

        // Add the player name to the list of players in the new game data,
        // ensuring that duplicate names are not added using a Set.
        newGame.players = [...new Set([...currentGame.players, playerName])];
      }

      // If the log line indicates a kill
      if (isKill) {
        // Extract the death cause and the killed player from the log line
        const deathCause = line.split('by ')[1];
        const killedPlayer = line.split('killed ')[1].split(' by')[0];

        // Update the total number of kills in the new game data
        newGame.total_kills++;

        // Update the kills_by_means object in the new game data,
        // tracking the number of kills for each death cause.
        newGame.kills_by_means = {
          ...currentGame.kills_by_means,
          [deathCause]: (currentGame.kills_by_means[deathCause] || 0) + 1,
        };

        // Update the kills object in the new game data,
        // tracking the number of kills for each player.
        newGame.kills = {
          ...currentGame.kills,
          [killedPlayer]: (currentGame.kills[killedPlayer] || 0) + 1,
        };

        // Update the player ranking in the new game data,
        // based on the number of kills for each player in descending order.
        newGame.player_ranking = Object.entries(newGame.kills)
          .sort(([, a], [, b]) => b - a)
          .map(([player]) => player);
      }

    // After processing the log line, we return the updated game data.
    return newGame; // Return the updated game data
  } catch (err: any) {
    // If an error occurs during parsing (e.g., unexpected log format),
    // we catch the error, log the details, and return the current game data without any changes.
    console.error(`Failed to parse log line. Error: ${err.message}`);
    return currentGame;
  }
}

  /**
   * Parses the whole log file and generates game data for each game
   * @param   {string} filename - Name of the log file
   * @returns {object} - An object with game data for each game
   */
  parseLogFile(filename: string): Record<string, GameData> {
    try {
      // Read the log file and split it into individual lines
      const lines = fs.readFileSync(filename, 'utf8').split('\n');

      // Process each line and generate game data for each game
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
      // Convert the game data to JSON and print it with proper indentation
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
      // Parse the log file and generate game data for each game
      const games = this.parseLogFile(filename);

      // Generate match reports and print them to the console
      this.generateMatchReports(games);
    } catch (err: any) {
      console.error(`Failed to parse log file and generate reports. Error: ${err.message}`);
    }
  }
}

 // Create a new instance of QuakeLogParser and parse a log file
const parser = new QuakeLogParser();
parser.parseAndReport('qgames.log');
