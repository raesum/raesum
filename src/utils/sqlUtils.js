export const paginationCalculate = (pNumber, quantity) => {
    if (!pNumber && !quantity) {
        return '';
    }

    // Default 1
    if (!pNumber || isNaN(parseInt(pNumber))) {
        pNumber = 1;
    }

    // Default page size to 10
    if (!quantity || isNaN(parseInt(quantity))) {
        quantity = 10;
    }

    return 'LIMIT ' + (pNumber - 1) + ',' + quantity * pNumber;
};
