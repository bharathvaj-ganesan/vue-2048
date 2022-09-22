<template>
  <div class="wrapper">
    <Header :score="stats.currScore" :best-score="stats.bestScore"/>
    <div class="description">
      <p>
        Join the numbers and get to the
        <strong>2048 tile!</strong>
      </p>
      <div id="new-game" @click="init">New Game</div>
    </div>
    <div ref="game">
      <GameContainer :dmns="gridDmns" :tiles="tiles" :grid="grid" :tile-position="tilePosition"/>
    </div>
    <Footer :isSpeechSupported="isSpeechSupported"/>
  </div>
</template>

<script>
import Header from "./Header.vue";
import Footer from "./Footer.vue";
import GameContainer from "./GameContainer.vue";
import KeyboardListenner from "../utils/keys.js";
import SpeechListenner from "../utils/speech.js";
import swipeListenner from "../utils/swipe.js";
import { store, mutations } from "./../store";

export default {
  name: "Wrapper",
  components: {
    Header,
    GameContainer,
    Footer
  },
  data() {
    return {
      initalTiles: 2,
      tileDmns: 124,
      tilePos: 121,
      tiles: [],
      grid: [],
      isSpeechSupported: false,
      isGameOver: false
    };
  },
  created() {
    this.resetDmns();
    this.init();
  },
  mounted() {
    this.keyBoardInit();
    this.touchInit();
    this.speechInit();

    window.onbeforeunload = event => {
      const msg = "Do you want to play again ?";
      event.returnValue = msg;
      return "Do you want to play again ?";
    };
  },
  computed: {
    gridDmns() {
      return this.grid.length * this.tileDimension;
    },
    preference() {
      return store.preference;
    },
    stats() {
      return store.stats;
    },
    message() {
      return store.message;
    }
  },
  watch: {
    message(msg) {
      if (!msg) {
        return;
      }
      if (window.alert(msg)) {
        this.init();
      }
    }
  },
  methods: {
    touchInit() {
      swipeListenner(this.$refs.game, this.move);
    },
    keyBoardInit() {
      const keyboardListenner = new KeyboardListenner();
      keyboardListenner.on("move", this.move);
      keyboardListenner.on("restart", this.restart);
    },
    speechInit() {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.isSpeechSupported = true;
        let speechListenner = new SpeechListenner(SpeechRecognition);
        speechListenner.start();
        speechListenner.onCommand(this.move);
        speechListenner.recognition.onspeechend = () => {
          speechListenner = null;
          this.speechInit();
        };
      }
    },
    availableTiles() {
      const tiles = [];
      const size = this.preference.size;

      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          if (!this.grid[x][y]) {
            tiles.push({
              x,
              y
            });
          }
        }
      }

      return tiles;
    },
    resetDmns() {
      const elem = document.documentElement;
      const body = document.getElementsByTagName("body")[0];
      const x = window.innerWidth || elem.clientWidth || body.clientWidth;

      if (x < 520) {
        this.tileDimension = 78;
        this.tilePosition = 75;
      } else {
        this.tileDimension = 124;
        this.tilePosition = 121;
      }
    },
    init() {
      this.initGrid(this.preference.size);

      this.tiles = [];
      mutations.setScore(0);
      this.clearMessage();

      let initalTiles = this.initalTiles;
      while (initalTiles) {
        this.addRandomTile();
        initalTiles -= 1;
      }
    },
    initGrid(size) {
      this.grid = Array(size)
        .fill()
        .map(() => Array(size).fill(0));
    },
    addTile(tile = {}) {
      this.tiles.push({
        x: tile.x,
        y: tile.y,
        value: tile.value,
        isNew: true,
        isMerged: tile.isMerged
      });
      this.grid[tile.x][tile.y] = 1;
    },
    addRandomTile() {
      if (this.availableTiles().length > 0) {
        const value = Math.random() < 0.9 ? 2 : 4; // TODO move to constants
        const randomTile = this.randomAvailableTile();
        this.tiles.forEach(tile => (tile.isNew = false));
        this.addTile({
          x: randomTile.x,
          y: randomTile.y,
          value: value,
          isMerged: false
        });
      }
    },
    randomAvailableTile() {
      const availableTiles = this.availableTiles();
      if (availableTiles.length) {
        return availableTiles[
          Math.floor(Math.random() * availableTiles.length)
        ];
      }
    },
    getDirVector(direction) {
      const map = {
        0: {
          x: 0,
          y: -1
        }, // Up
        1: {
          x: 1,
          y: 0
        }, // Right
        2: {
          x: 0,
          y: 1
        }, // Down
        3: {
          x: -1,
          y: 0
        } // Left
      };

      return map[direction];
    },
    withinBounds(position) {
      const size = this.preference.size;

      return (
        position.x >= 0 &&
        position.x < size &&
        position.y >= 0 &&
        position.y < size
      );
    },
    findTile(position) {
      if (position.x === -1 || position.y === -1) {
        return null;
      } else {
        return this.tiles.find(
          item => item.x === position.x && item.y === position.y
        );
      }
    },
    moveTile(tile, position) {
      if (tile.x === position.x && tile.y === position.y) {
        return false;
      } else {
        this.grid[tile.x][tile.y] = 0;
        this.grid[position.x][position.y] = 1;

        tile.x = position.x;
        tile.y = position.y;

        return true;
      }
    },
    mergeTiles(curr, next) {
      next.value *= 2;
      next.isMerged = true;

      const tiles = this.tiles;

      //Better Way to find index of data
      for (let key in tiles) {
        if (tiles[key].x === curr.x && tiles[key].y === curr.y) {
          this.tiles.splice(parseInt(key), 1);
          break;
        }
      }

      this.grid[curr.x][curr.y] = 0;

      // Update the score
      this.updateScore(next.value);

      return true;
    },
    updateScore(score = 0) {
      //On init
      if (score === 0) {
        mutations.setScore(0);
        return false;
      }

      mutations.setScore(this.stats.currScore + score);

      // The mighty 2048 tile
      if (score === 2048) {
        mutations.setScore(score);
        mutations.setMessage("You won!");
        return;
      }
    },
    tileMatchesAvailable() {
      const size = this.preference.size;

      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          if (this.grid[x][y]) {
            for (let direction = 0; direction < 4; direction++) {
              const vector = this.getDirVector(direction);
              const cell = {
                x: x + vector.x,
                y: y + vector.y
              };
              let otherCell;

              if (
                cell.x >= 0 &&
                cell.x < size &&
                cell.y >= 0 &&
                cell.y < size
              ) {
                otherCell = this.grid[cell.x][cell.y];
              } else {
                continue;
              }

              if (
                otherCell &&
                this.findTile(cell).value ===
                  this.findTile({
                    x: x,
                    y: y
                  }).value
              ) {
                return true; // These two tiles can be merged
              }
            }
          }
        }
      }

      return false;
    },
    findFarthestPosition(cell, vector) {
      let previous;

      do {
        previous = cell;
        cell = {
          x: previous.x + vector.x,
          y: previous.y + vector.y
        };
      } while (this.withinBounds(cell) && !this.grid[cell.x][cell.y]);

      return {
        farthest: previous,
        next: cell // Used to check if a merge is required
      };
    },
    buildTraversals(vector) {
      const traversals = {
        x: [],
        y: []
      };
      const size = this.preference.size;

      for (let pos = 0; pos < size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
      }

      // Always traverse from the farthest cell in the chosen direction
      if (vector.x === 1) {
        traversals.x = traversals.x.reverse();
      }
      if (vector.y === 1) {
        traversals.y = traversals.y.reverse();
      }

      return traversals;
    },
    move(direction) {
      // this.speechInit();
      const vector = this.getDirVector(direction);
      if (!vector) {
        return;
      }
      const traversals = this.buildTraversals(vector);
      let moved = false;
      let gameover = true;

      traversals.x.forEach(x => {
        traversals.y.forEach(y => {
          if (this.grid[x][y]) {
            const tile = this.findTile({
              x,
              y
            });

            const positions = this.findFarthestPosition(
              {
                x,
                y
              },
              vector
            );
            const next = this.findTile(positions.next);

            if (next && next.value === tile.value) {
              moved = this.mergeTiles(tile, next, positions.next);
            } else {
              moved = !moved ? this.moveTile(tile, positions.farthest) : moved
            }
          } else {
            gameover = false;
          }
        });
      });

      this.isGameOver = gameover;
      if (this.isGameOver && !this.tileMatchesAvailable()) {
        mutations.setMessage("Game Over! You Lost");
      }

      if (moved) {
        this.addRandomTile();
      }
    },
    clearMessage() {
      mutations.setMessage("");
    },
    restart() {
      if (window.confirm("Do you want to play again ?")) {
        this.init();
      }
    }
  }
};
</script>

<style scoped>
.wrapper {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: 500px;
}

@media screen and (max-width: 520px) {
  .wrapper {
    max-width: 300px;
    min-width: 320px;
  }
}

#new-game {
  display: inline-block;
  background: #8f7a66;
  border-radius: 3px;
  padding: 0 20px;
  text-decoration: none;
  color: #f9f6f2;
  height: 40px;
  line-height: 42px;
  display: block;
  text-align: center;
  cursor: pointer;
  font-weight: bold;
}

.description {
  display: flex;
  justify-content: space-between;
}

.description p {
  font-size: 1.2rem;
  margin: 8px 0px;
}
</style>
