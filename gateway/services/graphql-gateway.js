
const { ApolloServer } = require('apollo-server');

const service = {
  name: 'graphql-gateway',
  created() {
    this.server = new ApolloServer({
      schema: this.graphqlSchema
    });
  },
  async started() {
    const { url } = await this.server.listen();

    this.logger.info(`🚀 Server ready at ${url}`);
  },
  async stopped() {
    await this.server.stop();
  },
};

module.exports = service;