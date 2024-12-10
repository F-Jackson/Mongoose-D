export class ForeignKeyProcessor {
    constructor(mongoModel, _FKS_MODEL_) {
        this.mongoModel = mongoModel;
        this._FKS_MODEL_ = _FKS_MODEL_;
    }

    processForeignKeys = async() => {
        const activeFks = await this._getActiveForeignKeys();
        const fksModels = await this._fetchForeignKeyModels();

        this._populateForeignKeyMetadata(activeFks, fksModels);
    };

    _processEntry = async(slicedKey, schemaEntries, entries, nested) => {
        let key = slicedKey[0];
        const schemaEntry = schemaEntries[key];

        if (slicedKey.length === 1) {
            if (key in schemaEntries) {
                if (nested.length > 0) {
                    key = `${nested.join(".")}.${key}`;
                }

                entries.push([key, schemaEntry]);
            }
        } else {
            const entryNested = [ ...nested, slicedKey[0] ];
            const newKeys = slicedKey.slice(1);
            await this._processEntry(newKeys, schemaEntry, entries, entryNested);
        }
    }

    _processEntries = async() => {
        const paths = Object.entries(this.mongoModel.schema.paths);
        const schemaEntries = this.mongoModel.schema.obj;
        const entries = [];

        for (const [key, _] of paths) {
            const slicedKey = key.split(".");

            await this._processEntry(slicedKey, schemaEntries, entries, []);
        }

        return entries;jhk
    }

    _getActiveForeignKeys = async() => {
        const activeFks = [];
        const schemaEntries = await this._processEntries();

        const foreignKeys = schemaEntries.filter(([_, value]) => this._isForeignKey(value));

        for (const [key, value] of foreignKeys) {
            const { isArray, fkType } = this._getForeignKeyType(value);
            if (fkType.schemaName !== "ObjectId") continue;

            await this._findOrCreateForeignKeyModel(key, value, isArray);
            activeFks.push({ fk: key, ref: value.ref });
        }

        return activeFks;
    };

    _isForeignKey = (value) => {
        return value.type && value.__linked;
    };

    _getForeignKeyType = (value) => {
        const isArray = Array.isArray(value.type);
        const fkType = isArray ? value.type[0] : value.type;
        return { isArray, fkType };
    };

    _findOrCreateForeignKeyModel = async(key, value, isArray) => {
        let fksModel = await this._FKS_MODEL_.findOne({
            model: this.mongoModel.modelName,
            fk: key,
            fk_ref: value.ref,
        });

        if (!fksModel) {
            fksModel = await this._FKS_MODEL_.create({
                model: this.mongoModel.modelName,
                fk: key,
                fk_ref: value.ref,
                fk_isArray: isArray,
                fk_isImmutable: value.immutable,
                fk_isRequired: value.required,
                fk_isUnique: value.unique,
            });
        }

        return fksModel;
    };

    _fetchForeignKeyModels = async() => {
        return await this._FKS_MODEL_.find({ model: this.mongoModel.modelName });
    };

    _populateForeignKeyMetadata = (activeFks, fksModels) => {
        if (fksModels.length === 0) return;

        this.mongoModel.__FKS__ = {};
        const activeFksMap = new Map(activeFks.map(model => [`${model.fk}:${model.ref}`, true]));

        for (const model of fksModels) {
            const isActive = activeFksMap.has(`${model.fk}:${model.fk_ref}`);
            const slicedKey = model.fk.split(".");
            const key = slicedKey[slicedKey.length - 1];
            const nested = slicedKey.slice(0, -1);

            this.mongoModel.__FKS__[key] = {
                ref: model.fk_ref,
                activated: isActive,
                isArray: model.fk_isArray,
                isImmutable: model.fk_isImmutable,
                isRequired: model.fk_isRequired,
                isUnique: model.fk_isUnique,
                nested: nested,
                fullPath: model.fk
            };
        }
    };
}
