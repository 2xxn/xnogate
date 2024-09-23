const { payments } = require("../dist/index.js");

const AMT = 0.0002;
const DEST = "nano_3getnanons1aaqo5itbm8wdbzhtsp7tctd6p6qa7axwff7ocemzs3w381kfy";
const TMT = 3000; // this is in seconds

(async()=>{
    // payments.create({timeout:420},0.0001); // will throw missing destination address error
    let x = payments.create({ timeout:TMT, destination:DEST }, AMT); 
    x.user = "Mark";
    console.log("Send", AMT, "to", x.address);
    x.start((o)=>{ // o is the "x" object
        console.log(o.user, "paid the amount")
    },
    (o)=>{
        console.log(o.user,"timed out :(")
    });
    // Wanna force the timeout? Do your onTimeout function and clearInterval(x.interval)
})();