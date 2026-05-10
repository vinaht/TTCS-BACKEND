const createListResponse = ({ items, page, limit, total, totals = {} }) => {
    const totalItems = Number(total) || 0;

    return {
        items,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit)
        },
        totals: {
            total: totalItems,
            ...totals
        }
    };
};

module.exports = {
    createListResponse
};
