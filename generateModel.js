export class ForeignKeyProcessor {
    constructor(mongoModel) {
        this.mongoModel = mongoModel;
    }

    processForeignKeys = async() => {
        const activeFks = await this._getActiveForeignKeys();

        this._populateForeignKeyMetadata(activeFks);
    };

    _getActiveForeignKeys = async () => {
        const activeFks = {};
        const paths = Object.entries(this.mongoModel.schema.paths);
        const schemaEntries = this.mongoModel.schema.obj;
    
        const doAsync = async(path) => {
            const slicedKey = path.split(".");
            const stack = [{ key: slicedKey, nested: [] }];
            let schemaEntry = schemaEntries;

            while (stack.length > 0) {
                const { key, nested } = stack.pop();
                const currentKey = key[0];
                schemaEntry = schemaEntry[currentKey];
                
                if (!schemaEntry) continue;
                
                if (key.length === 1) {
                    const entrie = schemaEntry;
                    if (!entrie.type) continue;

                    const isArray = Array.isArray(entrie.type);
                    const tp = isArray ? entrie.type[0] : entrie.type;

                    if (tp.schemaName !== "ObjectId") continue;

                    const obj = {
                        path: path,
                        required: entrie.required || false,
                        immutable: entrie.immutable || false,
                        unique: entrie.unique || false,
                        array: isArray
                    };

                    if (activeFks[entrie.ref]) {
                        activeFks[entrie.ref].push(obj);
                    } else {
                        activeFks[entrie.ref] = [ obj ];
                    }
                } else {
                    stack.push({
                        key: key.slice(1),
                        nested: [...nested, currentKey],
                    });
                }
            }
        }

        Promise.all(
            paths.map(([key, _]) => doAsync(key))
        );
    
        return activeFks;
    };

    _populateForeignKeyMetadata = (activeFks) => {
        if (activeFks.length === 0) return;

        this.mongoModel._FKS = activeFks;
    };
}
