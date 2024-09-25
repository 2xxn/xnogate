const { NanoWebSocketManager } = require("../dist/modules/websocket");

(async()=>{
    // Existing address test
    const manager = new NanoWebSocketManager({
        ws: "wss://www.blocklattice.io/ws"
    })

    manager.subscribeAddress("nano_1iykwbzepxjqizaicq4mqsgs3bqsagwnr91dqtx63phudbo8mwqewyokk9ek")
    manager.subscribeAddress("nano_3getnanons1aaqo5itbm8wdbzhtsp7tctd6p6qa7axwff7ocemzs3w381kfy")
    
    manager.on("confirmed", console.log)
})();
