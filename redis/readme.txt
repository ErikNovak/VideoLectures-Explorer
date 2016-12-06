Running the redis server:

cmd: redis-server name-of-file.conf

This is going to run the server with the name-of-file.conf configurations.
If the server doesn't run, you need to change the the port number in the
.conf file. 
Also other things like dump path and file name can be changed inside this file.

Example: 

cmd: redis-server SmartJobs-DatabaseServer.conf

Will run a redis server on port 6780.




