function chunk (arr, len) {
    var chunks = [],
        i = 0,
        n = arr.length;
  
    while (i < n) {
      chunks.push(arr.slice(i, i += len));
    }
    return chunks;
}

const sleep = (t) => new Promise((r) => {
    setTimeout(() => {
        r();
    }, t);
});

const PromiseAllSequential = async (promises, concurrently = 100, timeout = 100) => {
    promises = chunk(promises, concurrently);
    const results = [];
    for(let i = 0; i < promises.length; i++) {
        results.push(...await(Promise.all(promises[i])));
        await sleep(timeout);
    }
    return results;
}

module.exports = { PromiseAllSequential };
