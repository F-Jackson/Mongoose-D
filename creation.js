export class ForeignKeyCreator {
    constructor(mongoModel, mongoD) {
        this.mongoModel = mongoModel;
        this.modelName = mongoModel.modelName;
        this.mongoD = mongoD;
    }

    async _creationFks(instance) {
        const relations = [];
        const promisesCreateFks = [];

        try {
            await this._createFks(instance, relations, promisesCreateFks);
            await Promise.all(promisesCreateFks);
            return relations;
        } catch (error) {
            await this._cleanupRelations(relations);
            throw error;
        }
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
    async processModelRelations(model, fks, findIds) {
        return Promise.all(
            fks.map(async (fk) => {
                const value = await this.getNestedProperty(model, fk.path);
                const returnValue = { path: fk.path };

                if (value["_doc"]) {
                    returnValue["object"] = value;
                    returnValue["id"] = value._id;
                } else {
                    returnValue["id"] = value;
                    findIds.add(value.toString());
                }

                return returnValue;
            })
        );
    }

    /**
     * Inicializa as relações para um modelo específico
     */
    async initializeModelRelations(modelName, fks, models, mongoD) {
        const model = mongoD.models[modelName];
        const relations = {};
        const findIds = new Set();

        await Promise.all(
            models.map(async (modelObj) => {
                relations[modelObj._id] = await this.processModelRelations(modelObj, fks, findIds);
            })
        );

        return { model, relations, findIds};
    }

    /**
     * Processa todas as entradas (fkEntries) para gerar as relações
     */
    async processAllRelations(fkEntries, models, mongoD) {
        const modelsRelations = {};

        await Promise.all(
            fkEntries.map(async ([modelName, fks]) => {
                modelsRelations[modelName] = await this.initializeModelRelations(modelName, fks, models, mongoD);
            })
        );

        return modelsRelations;
    }

    async create(models) {
        if (!Array.isArray(models)) models = [models];
        const fkEntries = Object.entries(this.mongoModel._FKS);

        const modelsRelations = await this.processAllRelations(fkEntries, models, this.mongoD);

        console.log(modelsRelations);
        return;

        try {
            const allRelations = [];

            for (const model of models) {
                const relations = await this._creationFks(model);
                model.__relations = relations;
                allRelations.push(...relations);
            }

            await this._bulkInsertRelations(allRelations);
        } catch (error) {
            await this._cleanupModels(models);
            throw error;
        }
    }

    async _createFks(instance, relations, promisesCreateFks) {
        const modelId = instance._id;

        for (const [key, value] of this.fksModels) {
            if (!value.activated) continue;

            let ids = instance;
            value.nested.forEach((nested) => {
                ids = ids[nested];
            });

            ids = ids[key];

            if (!Array.isArray(ids)) ids = [ids];

            const uniqueCheckPromises = ids.map(id => this._ensureUnique(value, id, modelId));
            await Promise.all(uniqueCheckPromises);

            ids.forEach(id => {
                promisesCreateFks.push(this._createRelation(modelId, id, value, relations));
            });
        }
    }

    async _ensureUnique(fk, id, modelId) {
        const existingRelation = await _FKS_.findOne({
            parent_ref: this.modelName,
            parent_id: modelId,
            child_ref: fk.ref,
            child_id: id,
            child_fullPath: fk.fullPath,
        }).lean();

        if (existingRelation) throw new Error("Relation already exists");
    }

    async _createRelation(modelId, childId, value, relations) {
        const fkRelation = {
            parent_id: modelId,
            parent_ref: this.modelName,
            child_id: childId._id,
            child_ref: value.ref,
            child_fullPath: value.fullPath,
        };

        relations.push(fkRelation);
    }

    async _cleanupRelations(relations) {
        if (relations.length > 0) {
            const relationIds = relations.map(relation => relation._id);
            await _FKS_.deleteMany({ _id: { $in: relationIds } });
        }
    }

    async _cleanupModels(models) {
        if (models.length > 0) {
            const modelIds = models.map(model => model._id);
            await this.mongoModel.deleteMany({ _id: { $in: modelIds } });
        }
    }

    async _bulkInsertRelations(relations) {
        if (relations.length > 0) {
            await _FKS_.insertMany(relations);
        }
    }
}
