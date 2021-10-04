function parseResponseForFailures(res, queryTimeout) {
    if (res.status === 'rejected') {
        return {
            error: `Query to ${res.reason.config.url} failed, request timed out after ${queryTimeout}ms`,
            url: res.reason.config.url
        }
    } else if (res.value.status !== 200 || res.value.data === {}) {
        return {
            error: `Query to ${res.value.config.url} failed with status ${res.value.status}`,
            url: res.value.config.url
        }
    }
    return {
        error: null,
        url: res.value.config.url
    }
}

module.exports = { parseResponseForFailures }