#!/bin/bash

echo 'run application_start.sh: ' >> /home/ec2-user/Noosa_Engage/deploy.log

echo 'pm2 restart noosa-engage' >> /home/ec2-user/Noosa_Engage/deploy.log
pm2 restart noosa-engage >> /home/ec2-user/Noosa_Engage/deploy.log