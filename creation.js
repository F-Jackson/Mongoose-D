import { RelationSchema } from "./models";

export class ForeignKeyCreator {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.modelName = mongoModel.modelName;
        this.mongoD = mongoD;

        this.to = {};
        this.from = {
            [`${this.modelName}`]: {
                model: this.mongoD.models[this.modelName],
                ids: {}
            }
        };
    }

    /**
     * Função para buscar propriedades aninhadas (assíncrona)
     */
    async getNestedProperty(obj, path) {
        return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    }

    /**
     * Processa as relações de um modelo específico
     */
    async processModelRelations(model, fks) {
        return Promise.all(
            fks.map(async (fk) => {
                const value = await this.getNestedProperty(model, fk.path);
                const returnValue = [ fk.path, value._id.toString() ];

                return returnValue;
            })
        );
    }

    /**
     * Inicializa as relações para um modelo específico
     */
    async initializeModelRelations(fks, models) {
        console.log(models);
        await Promise.all(
            models.map(async (modelObj) => {
                const fkValues = await this.processModelRelations(modelObj, fks);

                this.from[this.modelName]["ids"][modelObj._id] = [ ...fkValues ];
            })
        );

        //return { model, relations};
    }

    /**
     * Processa todas as entradas (fkEntries) para gerar as relações
     */
    async processAllRelations(fkEntries, models) {
        const modelsRelations = {};

        await Promise.all(
            fkEntries.map(async ([modelName, fks]) => {
                this.to[modelName] = {
                    model: this.mongoD.models[modelName],
                    //fks: fks,
                    ids: {}
                };

                //this.from[this.modelName]["fks"] = fks;
                
                await this.initializeModelRelations(
                    fks, 
                    models
                );
            })
        );

        return modelsRelations;
    }

    async create(models) {
        if (!Array.isArray(models)) models = [models];
        const fkEntries = Object.entries(this.mongoModel._FKS);

        await this.processAllRelations(fkEntries, models);
        console.log(`||  TO  ||:  ${JSON.stringify(this.to)}`);
        console.log(`||  FROM  ||:  ${JSON.stringify(this.from)}`);
    }

    async _bulkInsertRelations(relations) {
        if (relations.length > 0) {
            await _FKS_.insertMany(relations);
        }
    }
}
