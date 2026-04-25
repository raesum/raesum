export const isJson = (item) => {
    if (typeof item === "object" && item !== null) {
        return true;
    }
    item = typeof item !== "string" ? JSON.stringify(item) : item;
    try {
        item = JSON.parse(item);
    } catch (e) {
        return false;
    }
    return false;
};

export const conditionallyParseJSON = (jsonCandidate) => {
    if (typeof jsonCandidate == "undefined" || jsonCandidate == "") {
        jsonCandidate = "{}";
    }

    if (isJson(jsonCandidate)) {
        return jsonCandidate;
    }

    let output;
    try {
        // String is parsable JSON
        output = JSON.parse(jsonCandidate);
    } catch (e) {
        // Not parsable JSON
        output = jsonCandidate;
    }
    return output;
};



