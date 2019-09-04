'use strict';

const { makeExecutableSchema, addResolversToSchema } = require('graphql-tools');
const { mergeTypeDefs, mergeResolvers } = require('graphql-toolkit');

module.exports = function ({ typeDefs, resolvers, imports }) {

  const actions = {};

  for (const [name, value] of Object.entries(resolvers)) {
    if (['Query', 'Mutation', 'Subscription'].indexOf(name) > -1) {
      for (const [field, func] of Object.entries(value)) {
        actions[`${name}.${field}`] = ({ params }) => func(null, params.args, params.context, params.info);
      }
    }
  }
  
  return {
    metadata: {
      typeDefs,
      imports
    },
    methods: {
      createResolvers(schema) {
        const queryResolvers = {};
        const mutationResolvers = {};

        // const query = schema.getQueryType();
        // const mutation = schema.getMutationType();
        // const subscription = schema.getSubscriptionType();

        for (const [name, value] of Object.entries(schema.getQueryType())) {
          queryResolvers[name] = (_, args, ctx, info) => {
            return this.broker.call(`author.Query.${name}`, { //TODO: fix
              args,
              context: { __debug: 'nothing' },
              info
            });
          }
        }

        const resolvers = mergeResolvers([queryResolvers, mutationResolvers, this.resolvers]);

        addResolversToSchema(schema, resolvers);
      },
      updateSchema(types = []) {
        this.logger.info(`${node.id}' updating schema.`);

        const schema = makeExecutableSchema({
          typeDefs: mergeTypeDefs(this.metadata.typeDefs, ...types.map(({ typeDefs }) => typeDefs)),
          resolvers: this.resolvers
        });

        this.createResolvers(schema);

        return schema;
      }
    },
    created() {
      this.resolvers = resolvers;
      this.graphqlSchema = this.updateSchema();
    },
    started() {
      this.interval = setInterval(() => {
        this.logger.info(`${node.id}' discovering typeDefs.`);

        broker.call("$node.services").then((services) => {
          const discoveredTypes = [];

          for (const service of services) {
            if (service.metadata.typeDefs) {
              discoveredTypes.push({
                name: service.name,
                typeDefs: service.metadata.typeDefs
              });
            }
          }

          this.updateSchema(discoveredTypes);
        });
        //this.broker.broadcast('graphql.schema', this.metadata.typeDefs);
      }, 5000); //TODO: configure timeout
    },
    actions
  };
};