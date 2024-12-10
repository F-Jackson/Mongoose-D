export class ForeignKeyProcessor {
    constructor(mongoModel, _FKS_MODEL_) {
        this.mongoModel = mongoModel;
        this._FKS_MODEL_ = _FKS_MODEL_;
    }

    processForeignKeys = async() => {
        console.log("fk");
        const activeFks = await this._getActiveForeignKeys();
        console.log("activeFks");

        this._populateForeignKeyMetadata(activeFks);
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

        await Promise.all(
            paths.map(async ([key, _]) => {
                const slicedKey = key.split(".");

                this._processEntry(slicedKey, schemaEntries, entries, []);
            })
        );

        return entries;
    }

    _getActiveForeignKeys = async () => {
        const activeFks = [];
        const schemaEntries = await this._processEntries();
    
        await Promise.all(
            schemaEntries.map(async ([key, value]) => {
                const isArray = Array.isArray(value);
    
                if (isArray) value = value[0];
    
                if (!this._isForeignKey(value, isArray)) return;
                if (value.type.schemaName !== "ObjectId") return;
    
                this._findOrCreateForeignKeyModel(key, value, isArray);
                activeFks.push({ fk: key, ref: value.ref });
            })
        );
    
        return activeFks;
    };    

    _isForeignKey = (value) => {
        return value.type && value.__linked;
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

    _populateForeignKeyMetadata = (activeFks) => {
        if (activeFks.length === 0) return;

        this.mongoModel.__FKS__ = {};
        for (const model of activeFks) {
            const slicedKey = model.fk.split(".");
            const key = slicedKey[slicedKey.length - 1];
            const nested = slicedKey.slice(0, -1);

            this.mongoModel.__FKS__[key] = {
                ref: model.fk_ref,
                activated: true,
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
