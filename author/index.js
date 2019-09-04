
const { ServiceBroker } = require('moleculer');
const graphqlMixin = require('./graphql');
const DB = require('./db');

const broker = new ServiceBroker({
  nodeID: 'node-author',
  transporter: 'nats://nats-server:4222',
  logLevel: 'info',
  cacher: 'memory'
});

const db = new DB();

broker.createService({
  name: 'author',
  mixins: [
    graphqlMixin({
      typeDefs: `
        # An author.
        type Author {
          id: ID!
          # The author name.
          name: String,
          # The author email.
          email: String
        }
        type Query {
          # Seach for an author by id.
          author(id: ID!, version: String) : Author
        }
        type Mutation {
          # Create a new book.
          author(name: String!) : Author
        }
      `,
      resolvers: {
        Query: {
          author(_, { id }, ctx, info) {
            return db.get(id);
          }
        },
        Mutation: {
          author(_, { name }, ctx, info) {
            return db.set({ name });
          }
        }
      }
    })
  ]
});

broker.start();