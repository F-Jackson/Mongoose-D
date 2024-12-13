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

    async getNestedProperty(obj, keys) {
        return keys.reduce((current, key) => (current && key in current ? current[key] : undefined), obj);
    }

    async create(models) {
        if (!Array.isArray(models)) models = [models];
        const fkEntries = Object.entries(this.mongoModel._FKS);
        const modelsRelations = {};

        for (let i = 0; i < fkEntries.length; i++) {
            const [modelName, fks] = fkEntries[i];
            modelsRelations[modelName] = {
                model: this.mongoD.models[modelName],
                relations: {}
            };

            for (let o = 0; o < models.length; o++) {
                const model = models[0];

                modelsRelations[modelName][relations][model._id] = [];

                for (let x = 0; x < fks.length; x++) {
                    const fk = fks[x];
                    const modelFk = await getNestedProperty(model, fk.path)
                    modelsRelations[modelName][relations][model._id].push({
                        path,
                        value: modelFk
                    })
                }
            }
        }

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
