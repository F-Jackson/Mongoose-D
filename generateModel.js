export class ForeignKeyProcessor {
    constructor(mongoModel) {
        this.mongoModel = mongoModel;
    }

    processForeignKeys = async() => {
        const activeFks = await this._getActiveForeignKeys();

        //this._populateForeignKeyMetadata(activeFks);
    };

    _getActiveForeignKeys = async () => {
        const activeFks = [];
        const paths = Object.entries(this.mongoModel.schema.paths);
        const schemaEntries = this.mongoModel.schema.obj;
        console.log(schemaEntries);
    
        const doAsync = async(key) => {
            const slicedKey = key.split(".");
            const stack = [{ key: slicedKey, nested: [] }];
            let schemaEntry = schemaEntries;

            while (stack.length > 0) {
                const { key, nested } = stack.pop();
                const currentKey = key[0];
                schemaEntry = schemaEntry[currentKey];

                console.log(`key: ${key}, nested: ${nested}, ck: ${currentKey}, schema: ${JSON.stringify(schemaEntry)}`);
                
                if (!schemaEntry) continue;
                
                if (key.length === 1) {
                    console.log(([key, schemaEntry]));
                } else {
                    stack.push({
                        key: key.slice(1),
                        nested: [...nested, currentKey],
                    });
                }
            }

            //
            //const isArray = Array.isArray(value);
    
            //if (isArray) value = value[0];

            //if (!this._isForeignKey(value)) return;

            //await this._findOrCreateForeignKeyModel(key, value, isArray, activeFks);
        }

        Promise.all(
            paths.map(([key, _]) => doAsync(key))
        );
    
        return activeFks;
    };    

    _isForeignKey = (value) => {
        if (value.type?.schemaName !== "ObjectId") return false;
        return value.__linked;
    };

    _findOrCreateForeignKeyModel = async(key, value, isArray, activeFks) => {
        let fksModel = activeFks.find(
            fk => fk.fk === key && fk.fk_ref === value.ref
        )

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

            activeFks.push(fksModel);
        }
    };

    _populateForeignKeyMetadata = (activeFks) => {
        if (activeFks.length === 0) return;

        this.mongoModel.__FKS__ = Object.fromEntries(
            activeFks.map(model => {
                const slicedKey = model.fk.split(".");
                const key = slicedKey.pop();
                return [
                    key,
                    {
                        ref: model.fk_ref,
                        activated: true,
                        isArray: model.fk_isArray,
                        isImmutable: model.fk_isImmutable,
                        isRequired: model.fk_isRequired,
                        isUnique: model.fk_isUnique,
                        nested: slicedKey,
                        fullPath: model.fk,
                    },
                ];
            })
        );
        
    };
}
