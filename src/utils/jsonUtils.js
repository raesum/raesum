

export function setNestedObjectValue(obj, keys, value) {
    keys = [...keys]; // clone the keys array
    const lastKey = keys.pop(); // get the last key

    // reduce the keys array to the nested object
    const lastObj = keys.reduce((prevObj, key) => prevObj[key] = prevObj[key] || {}, obj);

    // set the value to the nested object
    lastObj[lastKey] = value;
}