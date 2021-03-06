var commonH = require("commonHandler");
cc.Class({
    extends: cc.Component,

    properties: {
        ScoreLabel: {
            default: null,
            type: cc.Label
        },
        BallLabel: {
            default: null,
            type: cc.Label
        },
        scoreBoxs : {
            default: [],
            type: cc.Prefab,
        },
        ballPrefab: {
            default:null,
            type: cc.Prefab
        },
        bonusPrefab: {
            default:[],
            type: cc.Prefab
        },
        delBoxAnim: {
            default: null,
            type:cc.Prefab
        },  
        gameLayout: {
            default: null,
            type: cc.Layout
        },
        boxsNode: {
            default: null,
            type: cc.Node
        },

        bar : {
            default: null,
            type: cc.Sprite
        },
        resumeBtn: {
            default: null,
            type: cc.Node
        },
        resumeLayout:  {
            default: null,
            type: cc.Layout
        },
        gameoverLayout: {
            default:null,
            type: cc.Layout
        },
        restartBtn: {
            default: null,
            type: cc.Node
        },
        ballCnt: 10,
        shotStarted: false,
        shotReadyStatus: true,
        gameLevel: 1,
        tutorialNode: cc.Node,
        addBoxItem: cc.Node,
        addBallBtn: cc.Node,
        dialogWnd: cc.Node,
        ballGroupLabel: cc.Label,
        shotBallLabel: cc.Label

    },

    // LIFE-CYCLE CALLBACKS:

    onLoad () {
        this.score = 0;
        this.itemCnt = 5;
        this.ballGroupCnt = 0;

        //. ball object's array
        this.ballObj = [];
        this.delBoxPool = new cc.NodePool('delBox');

        var ls = cc.sys.localStorage;
        var r = ls.getItem("newStartGame");
        if (r == "" || r == null) {
            ls.setItem("newStartGame", 1);
            this.tutorialNode.active = true;           
        }
        this.totalBallCnt = 0;
        this.dialogWnd.getComponent('dialogWnd').init(this);
        this.isAddBoxFun = false;
        this.isAddBallFun = true;
        this.addBallGroupCnt = 0;

        this.scaleN = commonH.getScale();
        // if (cc.sys.platform == cc.sys.ANDROID) {
        //     var rr = cc.sys.windowPixelResolution.width / cc.sys.windowPixelResolution.height / 0.5633;
        //     this.node.getChildByName('bound').scaleX = rr;
        // }

     },

    start () {
        this.refreshGame();       

        var self = this;
        this.shotBallCnt = 0;

        this.gameLayout.node.on("touchend", function(event){
                self.shotBallCnt = self.ballObj.length;
                self.shotStarted = true;
                self.shotReadyStatus = false;
                self.shotInfo.pos = self.calcSpeedOfBall(self.shotInfo.pos, self.shotInfo.d);
                self.showBar(false);
                self.gameLayout.node.pauseSystemEvents(true);
        });

        this.resumeBtn.on("touchend", function(){
            self.resumeLayout.node.active = true;
            self.resumeLayout.node.getComponent('resumeGame').init(self);
            self.pauseGameStatus();
        });

        //. event put ball 
        this.gameLayout.node.on("comeback_ball", function(){
            self.ballPut ++;
           
            if (self.ballPut == self.ballObj.length) {
                self.ballPut = 0;
                //. addtional ball create.
                for (var i = 0; i < 10 * this.addBallGroupCnt; i++) {
                    this.ballObj.push(this.createBall(this.initBallPos));
                }
                this.ballCnt = this.ballObj.length;
                this.BallLabel.string = this.ballCnt;
                this.addBallGroupCnt = 0;

                self.scheduleOnce(function() {
                    self.gameLayout.node.resumeSystemEvents(true);
                    self.shotReadyFunc(); 
                }, 0.3);
            }
        }, this);

        //. when move touch, event bar move.
        this.gameLayout.node.on("touchmove", this.onTouchMove, this);

        //. event to add ball.
        this.gameLayout.node.on("add_ball", function(event){
            console.log("Add-Ball");
            var pos = event.getUserData();
            var w_ball = self.createBall(pos);     

            self.scheduleOnce(function() {
               var body = w_ball.getComponent(cc.RigidBody);
               body.active = true;
               body.gravityScale = 5;
               body.linearVelocity = cc.v2(0, -500);
            }, 0.1); 
            self.ballObj.push(w_ball);

            self.ballCnt++;
            self.BallLabel.string = self.ballCnt;
        });

        //. schedule shot ball
        this.schedule(function() {
            if (!self.shotStarted) 
                return;
            if (self.shotBallCnt == 0) {
                this.shotBallLabel.string = "";
                return;
            }
            
            self.shotBallCnt--;
            this.shotBallLabel.string = self.shotBallCnt;
            console.log(self.shotBallCnt);
            let comp = self.ballObj[self.shotBallCnt].getComponent('ball');

            comp.setInitSpeed(self.shotInfo.pos);
            comp.setRigidActive(true);
        }, 0.1); 
        
        //. restart button event
        this.restartBtn.on('btnClicked', function() {
            this.refreshGame();
            this.resumeLayout.node.active = false;
            this.resumeGameStatus();
        }, this);

        //. 
        this.addBoxItem.on('btnClicked', function() {
            if (this.isAddBoxFun) {
                this.shotReadyStatus = true;
                this.ballPut = 0;
                this.shotBallCnt = 0;
                this.showBar(false);
                for (var i = 0; i < this.ballObj.length; i++) {
                    this.ballObj[i].getComponent('ball').goInitPos(cc.v2(this.initBallPos.x, 980));
                }
            } else {
                this.dialogWnd.getComponent('dialogWnd').setContent(["欣党视频可以解锁\n收球功能。", "收球功能可以使用了"]);
                this.isAddBoxFun = true;
            }

        }, this);

        this.addBallBtn.on('touchend', function() {
            this.addBallGroupEvent();
        }, this);
       
    },

    update (dt) {

    },

    

    initGame () {

        //. ball put cnt
        this.ballPut = 0;
        this.gameLevel = 1;

        this.shotReadyStatus = true;
        this.shotStarted = false;

        //. ball init position.
        this.gameRegion = cc.rect(0, 0, this.gameLayout.node.width, this.gameLayout.node.height);

        this.initBallPos = cc.v2(320, 950);
        this.initBoxPos = new cc.Rect(50, 200, 540, 935);
        this.stepY = this.initBoxPos.height / 9.5;

        this.ScoreLabel.string = this.score;
        this.BallLabel.string = this.ballCnt;
        this.gameLayout.node.width = this.node.width;
        this.gameLayout.node.height = this.node.height;

        for (var i = 0; i < this.ballCnt; i++) {
            this.ballObj.push(this.createBall(this.initBallPos));
        }       
    },

    //. touchend event 
    onTouchEnd(event) {
        let pos = event.getLocation();
    },
    onTouchMove(event, d, e) {
        if (this.shotReadyStatus) {
            let pos = event.getLocation();
            this.getShotPosInfo(pos);
            this.bar.node.setScale(this.shotInfo.scale, this.shotInfo.scale);
            this.bar.node.setRotation(this.shotInfo.alpha);
        }

    },
    //. ball shot information
    getShotPosInfo(pos) {
        let len_x = pos.x - this.node.width / 2 * this.scaleN;
        let len_y = pos.y - this.initBallPos.y;

        // this.bar.node.setRotation(-20);
        if (len_y > 0)
            return;
        let scale_v = Math.abs(len_y) / (this.bar.node.height);
        let angle_v = Math.atan(len_x / len_y) * 180 / Math.PI;

        scale_v = (scale_v > 1) ? 1 : scale_v;
        scale_v = (scale_v < 0.3) ? 0.3 : scale_v;
        
        this.shotInfo.scale = scale_v;
        this.shotInfo.pos = cc.v2(len_x, len_y);
        this.shotInfo.alpha = angle_v;
    },

    calcSpeedOfBall(pos, d) {
        var dd = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
        let x, y;
        x = d / dd * pos.x;
        y = d / dd * pos.y;
        return cc.v2(x, y);
    },

    showBar(status) {
        this.bar.node.active = status;
    },

    //. box function.

    generateItemPosX(w, n, b_rand) {
        var _w = 108;//this.initBoxPos.width / this.itemCnt;
        var x, y;
        var _d = (_w - w) / 2;
        if (b_rand)
            _d = 10 * (1- cc.random0To1());

        y = this.initBoxPos.y + 30;
        x = this.initBoxPos.x + 108 * (n + 0.5) + _d;

        return cc.v2(x, y);
    },

    createItem(n, pos, value, type) {
        var w_item;
        if (type == 2) {
            w_item = cc.instantiate(this.scoreBoxs[n]);
            this.boxsNode.addChild(w_item);
            w_item.getComponent('box_func').init(this, 1);
            w_item.getComponent('box_func').setScore(value);
        } else if (type == 1) {
            w_item = cc.instantiate(this.bonusPrefab[n]);
            this.boxsNode.addChild(w_item);
        }
        
        w_item.setPosition(pos);
    },

    generateValue(start, end) {
        var a = start;
        var b = end;
        if (end < start) {
            a = end;
            b = start;
        } 
        return Math.round((b - a) * cc.random0To1()) + a;
    },

    //. about ball
    createBall(pos) {
        var newball = cc.instantiate(this.ballPrefab);
        var comp = newball.getComponent('ball');
        this.gameLayout.node.addChild(newball);
        newball.setPosition(pos);
        return newball;        
    },

    //. increase score function
    increaseSocre(step) {
        this.score += step;
        this.ScoreLabel.string = this.score;
    },
    //. shot ready function
    shotReadyFunc() {
        this.gameLevel ++;
        this.shotBallCnt = 0;
        this.shotBallLabel.string = this.ballCnt;
        for (var i = 0; i < this.ballObj.length; i++) {
            this.ballObj[i].x = this.initBallPos.x;
            this.ballObj[i].y = this.initBallPos.y;
        }
        this.showBar(true);
        this.shotReadyStatus = true;
        this.shotStarted = false;
        
        this.shotInfo= {
            alpha: 0,
            pos: cc.v2(0, 1),
            d: 1000,
            scale: 0.3
        };
        this.bar.node.setScale(this.shotInfo.scale, this.shotInfo.scale);
        this.bar.node.setRotation(this.shotInfo.alpha);
        this.updateBoxPosY();

        var w_bouns_cnt = Math.round(2 * cc.random0To1());
        var w_box_cnt = Math.ceil((this.itemCnt - w_bouns_cnt - 1) * cc.random0To1()) + 1;

        var objInfo = this.generateObjInfo(this.gameLevel * 2, this.gameLevel * 6, w_box_cnt, w_bouns_cnt);
        this.generateItems(objInfo, true);
    },

    updateBoxPosY() {
        var boxs = this.boxsNode.children;
        var limit_h = this.stepY * 7 + this.initBoxPos.y;
        var w_h = this.stepY * 6 + this.initBoxPos.y;
        for (var i = 0; i < boxs.length; i++) {
            boxs[i].y += this.stepY;
            if (boxs[i].name == 'box') {
                boxs[i].getComponent("box_func").plusPosY(this.stepY);
            }
            if (boxs[i].y > limit_h) {
                this.gameOver();
            }
            if (boxs[i].y > w_h) {
                if (boxs[i].name == 'box') {
                    boxs[i].getComponent("box_func").setUponStatus(1);
                } else {
                    boxs[i].getComponent("bonus").setUponStatus(1);
                }
            } 
        }
    },

    generateItems(info, b_rand) {

        var w_size = 60;
        for (var i = 0; i < info.idx.length; i++) {
            var idx = info.idx[i];
            var w_n = 0;
            if (idx == 1) { //. bonus
                w_n = Math.floor(this.bonusPrefab.length * cc.random0To1());
                this.createItem(w_n, this.generateItemPosX(w_size, i, b_rand), 0, idx, b_rand);
            } else if (idx == 2 && info.value[i] != 0) {  //. box
                w_n = Math.floor(this.scoreBoxs.length * cc.random0To1());
                this.createItem(w_n, this.generateItemPosX(w_size, i, b_rand), info.value[i], idx, b_rand);
            }

        }    

    },

    generateObjInfo(s_value, e_value, n_box, n_bonus) {
        
        var w_maxCnt = this.itemCnt;
        var w_value = Math.ceil((e_value - s_value) * cc.random0To1()) + s_value;
        var n_empty = w_maxCnt - n_box - n_bonus;

        // console.log("VVV:" + s_value + "::::" + e_value);

        //. 0: empty, 1: bouns, 2: boxs, 3: gold
        var w_obj_values = [];
        var w_obj = [], w_key = [];
        var w_type = {
            empty: 0, bouns: 1, box: 2, gold: 3
        } 


        for (var i = 0; i < w_maxCnt; i++) {
            w_obj.push(w_type.box);
            w_key.push(i);
            w_obj_values.push(0);
        }

        for (var i = 0; i < n_empty; i++) {
            var nn = Math.floor(w_key.length  * cc.random0To1());
            w_obj[w_key[nn]] = w_type.empty;
            w_key.splice(nn, 1);
        }
        for (var i = 0; i < n_bonus; i++) {
            var nn = Math.floor(w_key.length * cc.random0To1());
            w_obj[w_key[nn]] = w_type.bouns;
            w_key.splice(nn, 1);
        }

        for (var i = 0; i < w_obj.length; i++) {
            if (w_obj[i] == w_type.box) {
                var w_v = Math.ceil(w_value * cc.random0To1());
                w_value -= w_v;
                w_obj_values[i] = w_v;
            } 
        }
        return {
            idx: w_obj,
            value: w_obj_values
        }
    },

    removeBox: function (pos) {

        var anim = this.spawnDelBox();
        this.boxsNode.addChild(anim.node);
        anim.node.setPosition(pos);
        anim.play();
    },

    spawnDelBox: function () {
        var fx;
        if (this.delBoxPool.size() > 0) {
            fx = this.delBoxPool.get();
            return fx.getComponent('delFX');
        } else {
            fx = cc.instantiate(this.delBoxAnim).getComponent('delFX');
            fx.init(this);
            return fx;
        }
    },

    despawnDelBox (anim) {
        this.delBoxPool.put(anim);
    },

    //. pause game
    pauseGameStatus() {
        this.gameLayout.node.pauseSystemEvents(true);
        this.gameLayout.node.pauseAllActions();
        cc.director.getPhysicsManager().enabled = false;
        for (var i = 0; i < this.ballObj.length; i++) {
            this.ballObj[i].pauseAllActions();
        }
    },
    //. resume game
    resumeGameStatus() {
        cc.director.getPhysicsManager().enabled = true;
        this.gameLayout.node.resumeSystemEvents(true);
        this.gameLayout.node.resumeAllActions();
        for (var i = 0; i < this.ballObj.length; i++) {
            this.ballObj[i].resumeAllActions();        
        }
    },

    pauseGameEvent() {
        this.gameLayout.node.pauseSystemEvents(true);
        this.resumeBtn.pauseSystemEvents(true);
        this.addBoxItem.pauseSystemEvents(true);
        this.addBallBtn.pauseSystemEvents(true);
    },
    resumeGameEvent() {
        this.gameLayout.node.resumeSystemEvents(true);
        this.resumeBtn.resumeSystemEvents(true);
        this.addBoxItem.resumeSystemEvents(true);
        this.addBallBtn.resumeSystemEvents(true);
    },

    gameOver() {
        this.gameoverLayout.node.active = true;
        this.gameoverLayout.node.getComponent('gameOver').setScore(this.score);
        this.pauseGameStatus();

        var event = new cc.Event.EventCustom("sendScore", true);
        var data = {
            key: "k_total",
            score: this.score
        };
        event.setUserData(data);
        this.node.dispatchEvent(event);
    },

    refreshGame() {
        var n = this.ballObj.length;
        this.isAddBoxFun = false;
        this.isAddBallFun = false;

        for (var i = 0; i < n; i++) {
            var obj = this.ballObj.pop();
            obj.removeFromParent();
        }
        this.boxsNode.removeAllChildren();
        
        //. get ballGroup;
        this.ballGroupCnt = parseInt(cc.sys.localStorage.getItem('ballGroupCnt')); 
        this.setBallGroupCnt();      

        this.ballCnt = (this.ballGroupCnt + 1) * 10;
        this.initGame();
        this.shotReadyFunc();
        this.shotReadyFunc();
        this.shotReadyFunc();
    },

    setBallGroupCnt() {
        this.ballGroupLabel.string = this.ballGroupCnt + "/9";        
    },
    addBallGroupEvent() {
        if (this.ballGroupCnt > 8) {
            return;
        }
        if (this.isAddBallFun) {
            this.ballGroupCnt ++;
            this.addBallGroupCnt ++;
            
            cc.sys.localStorage.setItem('ballGroupCnt', this.ballGroupCnt);
            this.setBallGroupCnt();
        } else {
            this.dialogWnd.getComponent('dialogWnd').setContent(["10个球会进入宝箱邀请\n朋友一起开宝箱吧!"]);
            this.isAddBallFun = true;
        }
    }


});
