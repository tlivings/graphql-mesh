

const { ServiceBroker } = require("moleculer");
const gateway = require('./services/graphql-gateway');

const broker = new ServiceBroker({
  nodeID: 'node-gateway',
  transporter: 'nats://nats-server:4222',
  logLevel: 'info',
  cacher: 'memory'
});

broker.createService(gateway);

broker.start();