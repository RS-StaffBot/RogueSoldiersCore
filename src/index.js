const ApplicationProcess = require("./app/ApplicationProcess");

if (require.main === module) {

    const applicationProcess = new ApplicationProcess();
    applicationProcess.run();

}
