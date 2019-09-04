'use strict';

const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema, addResolveFunctionsToSchema } = require('graphql-tools');
const { mergeTypeDefs, mergeResolvers } = require('graphql-toolkit');

module.exports = function ({ typeDefs, resolvers }) {
  
  const mixin = {
    metadata: {
      typeDefs
    },
    methods: {
      createResolvers(schema) {
        const remoteResolvers = {};

        // const query = schema.getQueryType();
        // const mutation = schema.getMutationType();
        // const subscription = schema.getSubscriptionType();

        for (const [name, value] of Object.entries(schema.getQueryType().getFields())) {
          this.logger.info(`defining resolver for Query.${name}`);
          if (!resolvers.Query || !resolvers.Query[name]) {
            if (!remoteResolvers.Query) {
              remoteResolvers.Query = {};
            }
            remoteResolvers.Query[name] = async (_, args, ctx, info) => {
              this.logger.info(`calling book.Query.${name}`);
              try {
                return await this.broker.call(`book.Query.${name}`, { //TODO: fix
                  args,
                  context: { __debug: 'nothing' },
                  info
                });
              }
              catch (error) {
                const clean = error;
                delete clean.ctx;
                throw clean;
              }
            }
          }
        }

        for (const [name, value] of Object.entries(schema.getMutationType().getFields())) {
          this.logger.info(`defining resolver for Mutation.${name}`);
          if (!resolvers.Mutation || !resolvers.Mutation[name]) {
            if (!remoteResolvers.Mutation) {
              remoteResolvers.Mutation = {};
            }
            remoteResolvers.Mutation[name] = async (_, args, ctx, info) => {
              this.logger.info(`calling book.Mutation.${name}`);
              try {
                return await this.broker.call(`book.Mutation.${name}`, { //TODO: fix
                  args,
                  context: { __debug: 'nothing' },
                  info
                });
              }
              catch (error) {
                const clean = error;
                delete clean.ctx;
                throw clean;
              }
            }
          }
        }

        this.resolvers = mergeResolvers([remoteResolvers, resolvers]);
      },
      createSchema(types = []) {
        this.logger.info(`creating graphql schema.`);

        this.graphqlSchema = makeExecutableSchema({
          typeDefs: mergeTypeDefs([this.metadata.typeDefs, ...types.map(({ typeDefs }) => typeDefs)])
        });

        this.createResolvers(this.graphqlSchema);

        addResolveFunctionsToSchema({ schema: this.graphqlSchema, resolvers: this.resolvers });
      },
      async updateSchema(types = []) {
        this.logger.info(`updating graphql schema.`);

        this.createSchema(types);

        if (this.server) {
          await this.server.stop();
        }

        this.server = new ApolloServer({
          schema: this.graphqlSchema,
          resolvers: this.resolvers
        });

        const { url } = await this.server.listen();

        this.logger.info(`🚀 Server ready at ${url}`);
      }
    },
    created() {
      this.updateSchema([]);
    },
    async started() {
      this.interval = setInterval(() => {
        this.logger.info(`discovering typeDefs.`);

        this.broker.call("$node.services").then((services) => {
          const discoveredTypes = [];

          for (const service of services) {
            if (service.name === this.name) {
              continue;
            }
            if (service.metadata.typeDefs) {
              discoveredTypes.push({
                name: service.name,
                typeDefs: service.metadata.typeDefs
              });
            }
          }

          if (discoveredTypes.length > 0) {
            this.updateSchema(discoveredTypes);
          }
        });
        //this.broker.broadcast('graphql.schema', this.metadata.typeDefs);
      }, 10000); //TODO: configure timeout
    },
    async stopped() {
      await this.server.stop();
    },
    actions: {}
  };

  for (const [name, value] of Object.entries(resolvers)) {
    if (['Query', 'Mutation', 'Subscription'].indexOf(name) > -1) {
      for (const [field, func] of Object.entries(value)) {
        mixin.actions[`${name}.${field}`] = function ({ params }) {
          this.logger.info(`calling resolver ${name}.${field}`);
          return func(null, params.args, params.context, params.info);
        }
      }
    }
  }

  return mixin;
};