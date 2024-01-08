//-- game state -------------
  let screens = {
      "splash"       : "splash",       // -> goto instructions
      "instructions" : "instructions", // -> goto last screen
      "playing"      : "playing",      // -> goto removeCards or gameOver or instructions
      "removeCards"  : "removeCards",  // -> got playing, call nextLevel
      "gameOver"     : "gameOver",     // -> goto splash or playing (buttons)
      "credits"      : "credits",      // -> goto splash screen
  };
  let gameState = ({
    
  });

  let resetGame = () => {
    gameState.screen     = screens.splash;
    gameState.lastScreen = screens.splash;
    gameState.score = 0;
    gameState.level = 0;
    gameState.cards = [];
    gameState.remainingMoves = 20;
  }

  let nextLevel = () => {
    gameState.level++;
    gameState.remainingMoves += 10;
  }

  let goToRemoveCards = () => {
    gameState.screen = screens.removeCards;
  }

  let gameOver = () => {
    gameState.screen = screens.gameOver;
  }

//-- maze stuff -------------
  let minMazeSize = 11;

  let dirs = [
    [-1, -1], [ 0, -1], [ 1, -1],
    [-1,  0], [ 0,  0], [ 1,  0],
    [-1,  1], [ 0,  1], [ 1,  1],
  ];
  let lrud = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
  ];

  //2 invalid
  let validBitPatterns = [
    [1, 1, 1, 1, 1, 1, 2, 0, 2],
    [1, 1, 2, 1, 1, 0, 1, 1, 2],
    [2, 1, 1, 0, 1, 1, 2, 1, 1],
    [2, 0, 2, 1, 1, 1, 1, 1, 1],
  ];

  let safeFn = (n, ret=0) => {
    if (n == 0) return ret;
    return 1/(n);
  }

  let getSizeFromLevel = lvl => {
    let aspect = min(9/16 + safeFn(lvl*3), 1);
    let growth = min(lvl*10/200, 13);

    return [floor(minMazeSize + growth*5), floor(minMazeSize + growth*5*aspect)];
  }

  let getWallFromLevel = lvl => {
    let n = 0.5;
    return random() < min(lvl/200, 1); //distribution approaches n
  }

  //size, obstacles, goal, player position
  class Maze{
    constructor(lvl){
      this.lvl = lvl;
      this.genMaze();
    }
    inGrid(x, y){
      return x >= 0 && x < this.w && y >= 0 && y < this.h; 
    }
    printGrid(){
      for (let i = 0; i < this.w; i++){
        let s = "";
        for (let j = 0; j < this.h; j++) s += this.grid[i][j];
        console.log(s);
      }
    }
    genMaze(){
      let dims = getSizeFromLevel(this.lvl);
      this.w = dims[0];
      this.h = dims[1];
      this.grid = [];
      let visited = [];
      for (let i = 0; i < this.w; i++){
        this.grid.push([]);
        visited.push([]);
        for (let j = 0; j < this.h; j++){
          this.grid[i].push(1);
          visited[i].push(false);
        }
      }

      //maze gen
      let fronteir = [];
      let cx = floor(this.w/2);
      let cy = floor(this.h/2);
      this.grid[cx][cy] = 0;
      visited[cx][cy] = true;

      let addCells = (cx, cy) => {
        let arr = [];
        for (let dir of lrud){
          let x = cx + dir[0];
          let y = cy + dir[1];
          if (this.inGrid(x, y) && !visited[x][y]){
            arr.push([x, y]);
            visited[x][y] = true;
          }
        }
        return arr;
      }

      fronteir.push(...addCells(cx, cy));

      while(fronteir.length > 0){
        let idx = rInt(fronteir.length);
        let p = fronteir.splice(idx, 1)[0];

        let [x, y] = p;
        let compArr = [];
        for (let j = -1; j < 2; j++){
          for (let i = -1; i < 2; i++){
            let x2 = x+i;
            let y2 = y+j;
            let val = 1;
            if (this.inGrid(x2, y2)){
              val = this.grid[x2][y2];
            }
            compArr.push(val);
          }
        }

        //discover valid cells
        let validCell = false;
        for (let pat of validBitPatterns){
          let curValid = true;
          for (let i = 0; i < compArr.length; i++){
            let n1 = compArr[i];
            let n2 = pat[i];
            if (n2 != 2){
              if (n1 != n2){
                curValid = false;
                break;
              }
            }
          }
          validCell |= curValid;
        }

        if (validCell){
          this.grid[x][y] = 0;
          let arr2 = addCells(x, y);
          if (arr2.length > 0) fronteir.push(...arr2);
        }
      }

      // //random walls
      for (let i = 0; i < this.w; i++){
        for (let j = 0; j < this.h; j++){
          let val = (getWallFromLevel(this.lvl) ? 1 : 0);
          if (val == 1 && random() < .05) this.grid[i][j] = 1; 
          else if (random() < 1-max(this.lvl/500, .5)) this.grid[i][j] *= val;
          if (i == 0 || j == 0 || i == this.w-1 || j == this.h-1) this.grid[i][j] = 1;
        }
      }
      
      let secondary = rInt(2);
      let offset = rInt(2);
      let dir = rInt(2);
    
      //create goal point
      if (dir == 0){
        this.goal = [rInt(this.w-2)+1, secondary*(this.h-4)+offset+1];
      } else {
        this.goal = [secondary*(this.w-4)+offset+1, rInt(this.h-2)+1];
      }
      
      let padOut = (cx, cy) => {
        for (let d of dirs){
          let x = cx + d[0];
          let y = cy + d[1];
          if (this.inGrid(x, y) && x != 0 && y != 0 && x != (this.w-1) && y != (this.h-1)) this.grid[x][y] = 0;
        }
      }
      padOut(...this.goal);
      
      //create player position
      this.player = [cx, cy];
      padOut(...this.player);
    }
    render(){
      fill(1);
      stroke(0);
      for (let i = 0; i < this.w; i++){
        for (let j = 0; j < this.h; j++){
          let val = this.grid[i][j];
          fill(val);
          rect(i, j, 1, 1);
          pushPop(() => {
            if (i == this.goal[0] && j == this.goal[1]){
              fill(.15, 1, 1);
              noStroke();
              ellipse(i+.5, j+.5, .5);
            }
            if (i == this.player[0] && j == this.player[1]){
              fill(0, 1, 1);
              noStroke();
              ellipse(i+.5, j+.5, .5);
            }
          });
        }
      }
    }
  }

//-- card actions ----------
  let cardAspect = 1668/2388;

  let actions = {
    "up" : 1,
    "down" : 2,
    "left" : 4,
    "right" : 8,
    "jump" : 16, //in current direction
    "slide" : 32, //in current direction
  }
  //idea can create a hash using the maze

  //needs to be able to render card art, possibly tint graphics
  //need to 
  class Card{
    constructor(){
      this.indexes = numImgs.map(i => rInt(i));
      this.hits = []; //list of points rendered from player position
      this.numMoves = 0;
    }
    render(x, y, w, h){
      pushPop(() => {
        translate(x, y);

        for (let i = 0; i < this.indexes.length; i++){
          let name = imgNames[i];
          let idx  = this.indexes[i];
          let img  = assetMap[name][idx];
          let [w2, h2] = [w, h];

          pushPop(() => {
            if (i != 0){
              translate(w*.1, h*.14);
              w2 *= .8;
              h2 *= .7;
            }
            image(img, 0, 0, w2, h2);
          });
        }
      });
    }
  }

//-- layout stuff -----------------
  let cellSize = 20;
  let goalDim = [800, 600];
  let effectiveScale = 1;

  class Rect{
    constructor(x, y, w, h, name = ""){
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h; 
    }
    contains(x, y){
      return x > this.x && y > this.y && x < (this.x+this.w) && y < (this.y+this.h);
    }
    render(){
      noFill();
      stroke(.25, 1, 1);
      rect(this.x, this.y, this.w, this.h);
    }
  }
  let board      = new Rect(0, 0, ...goalDim);
  let cardArea   = new Rect(0, 350, 800, 250);
  let mazeArea   = new Rect(0, 0, 800, 350);
  let scoreArea  = new Rect(0, 0, 140, 350);
  let infoArea   = new Rect(660, 0, 140, 350);

//-- asset loading ------------------------------------

  let assetMap = {};
  let imgNames = ["card", "skin", "eyes", "lip", "nose", "eyebrow", "hair"];
  let numImgs  = [3, 3, 8, 8, 8, 8, 8];
  
  function preload(){
    //load assets here loadImage
    for(n = 0; n < imgNames.length; n++){
      let name = imgNames[n];
      assetMap[name] = [];

      let len = numImgs[n];
      for(let i=0; i < len; i++){  
        let img = loadImage('/assets/images/'+name+'_'+(i+1)+'.png');
        assetMap[name].push(img);
      }
    }
  }

//-- p5.js drawing ------------------------------------
  function setup (){
    pixelDensity(2);
    createCanvas();
    colorMode(HSB, 1, 1, 1);
    windowResized();
  }

  let maze;
  let cards;
  let init = () => {
    maze = new Maze(0);
    cards = [];
    for (let i = 0; i < 20; i++){
      cards.push(new Card());
    }
    resetGame();
  }

  function drawBoard(){
    effectiveScale = 1;
    
    //letterbox the boar
    let dim = goalDim;
    translate(width/2, height/2);
    let s = min(width/board.w, height/board.h);
    applyScale(s);
    translate(-board.w/2, -board.h/2);
    
    applyStrokeWeight(1);
    
    //render debug areas:
    board.render();
    cardArea.render();
    mazeArea.render();
    scoreArea.render();
    infoArea.render();
    
    translate(mazeArea.w/2, mazeArea.h/2);
    let s2 = min(mazeArea.w/maze.w, mazeArea.h/maze.h)*.9;
    applyScale(s2);
    translate(-maze.w/2, -maze.h/2);
    
    applyStrokeWeight(1);
    maze.render();
  }

  function drawCards(){
    // for(let i=0; i < imgNames.length; i++){      
    //   let name = imgNames[i];
    //   let len = assetMap[name].length;
    //   for(let j=0; j < len; j++){
    //     let img = assetMap[name][j];
    //     image(img, 0*200, j*300, 200, 300);
    //   }
    // }
    for (let i = 0; i < cards.length; i++){
      let card = cards[i];
      let stride = 10;
      let x = i%stride;
      let y = floor(i/stride);
      let w = 400; let h = 600;
      card.render(x*w, y*h, w, h);
    }
  }


  function draw(){
    background(1);
    //drawBoard();
    drawCards();
  }

  function windowResized(){
    resizeCanvas(windowWidth, windowHeight);
    init();
  }

  function keyPressed(){
    gameState.level++;
    init();
  }
  
//-- p5.js helper functions ----------------
  let pushPop = f => {push(); f(); pop();}
  let rInt    = (b,a=0) => {return floor(random()*(b-a) + a)}

  let applyScale = (s) => {
    scale(s);
    effectiveScale *= s;
  }
  let applyStrokeWeight = (w) => {
    strokeWeight(w/effectiveScale);
  }