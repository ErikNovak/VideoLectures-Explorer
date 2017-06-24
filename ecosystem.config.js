module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // Videolectures-DataServer
    {
      name      : 'Videolectures-DataServer',
      script    : 'data-server.js',
      instances : 1,
      exec_mode : "cluster",
      autorestart: true

    },
    // Videolectures-WebServer
    {
      name      : 'Videolectures-WebServer',
      script    : 'web-server.js',
      instances : 1,
      exec_mode : "cluster",
      autorestart: true
    }
  ]
};
