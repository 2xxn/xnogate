const { payments } = require("../dist/index.js");

const AMT = 0.00005;
const DEST = "nano_3ne639sua1y7c5oy1isaupa617y7k1gnuceab5m6ofor4uddn7t5yk37asq5";
const TMT = 420; // this is in seconds

(async()=>{
    // payments.create({timeout:420},0.0001); // will throw missing destination address error
    let x = payments.create({timeout:TMT,destination:DEST},AMT); 
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