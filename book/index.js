
const { ServiceBroker } = require('moleculer');
const graphqlMixin = require('./graphql');
const DB = require('./db');

const broker = new ServiceBroker({
  nodeID: 'node-book',
  transporter: 'nats://nats-server:4222',
  logLevel: 'info',
  cacher: 'memory'
});

const db = new DB();

broker.createService({
  name: 'book',
  mixins: [
    graphqlMixin({
      typeDefs: `
        type Author {
          _nothing: String @deprecated
        }
        # This is a book.
        type Book {
          id: ID!
          # The name of the book.
          name: String,
          # The book's author.
          author: Author
        }
        type Query {
          # Search for a book by id.
          book(id: ID!) : Book
        }
        type Mutation {
          # Create a new book.
          book(name: String!, author_id: ID!) : Book
        }
      `,
      resolvers: {
        Query: {
          book(_, { id }, ctx, info) {
            return db.get(id);
          }
        },
        Mutation: {
          book(_, { name, author_id }, ctx, info) {
            return db.set({ name, author_id });
          }
        }
      }
    })
  ]
});

broker.start();