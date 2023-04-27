# xnogate

xnogate is a safe, reliable payment gateway library for the NANO (XNO) cryptocurrency.

## Installation

To install xnogate, run the following command:

```
npm i xnogate
```

## Usage
<kbd>WARNING: do not use any of the keys or addresses listed below to send real assets!</kbd>

To use the payment gateway module, import it as follows:
```js
const { payments } = require("xnogate")
```

### Create a Payment

To create a new payment, call the `payments.create(config, amount)` method, passing in a configuration object and the desired amount in NANO. The configuration object should contain the following properties:

- `seed`: a 64-character string representing the seed to be used to generate the private key for the wallet. If not provided, a random seed will be generated.
- `index`: index of the wallet to use. If not provided, 0 will be used.
- `destination`: the address of the account to which the payment will be made.
- `timeout`: the timeout for the payment, in seconds.

Example:

```js
const config = {
  seed: "6e78325f7061796d656e745f676174657761795f746573745f786e6f67617465",
  index: 0,
  destination: "nano_3ujqppynxfakp59i99o75qkwi1dm6btox9gndegbnuyxpc53sw7ikmb1zp8z",
  timeout: 30 // 30 seconds
};

const amount = 0.5; // 0.5 NANO

const interval = payments.create(config, amount);
```

### Start a Payment

To start a payment, call the `payments.start(interval, onSuccess, onTimeout)` method, passing in the `interval` object returned from `payments.create`, as well as the `onSuccess` and `onTimeout` callbacks. `o` variable in the callback is the interval itself, you can retrieve or store some data there

Example:

```js
payments.start(interval, 
  (o) => { console.log("Payment successful"); }, 
  (o) => { console.log("Payment timed out"); }
);
```
Alternatively:
```js
interval.start(
  (o) => { console.log("Payment successful"); }, 
  (o) => { console.log("Payment timed out"); }
);
```

## Donate

If you find this module useful and would like to support its development, please consider making a donation to the following Nano address:

`nano_3ujqppynxfakp59i99o75qkwi1dm6btox9gndegbnuyxpc53sw7ikmb1zp8z`

Your contribution is greatly appreciated and will help ensure the continued maintenance and improvement of this project, and some extra motivation. Thank you for your support!