import readline from 'readline';

const readLineAsync = () => {
    const rl = readline.createInterface({
        input: process.stdin,
    });

    return new Promise((resolve) => {
        rl.prompt();
        rl.on('line', (line) => {
            rl.close();
            resolve(line);
        });
    });
};

export default readLineAsync;
