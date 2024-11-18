#!/bin/bash
echo 'run after_install.sh: ' >> /home/ec2-user/Noosa_Engage/deploy.log

echo 'cd /home/ec2-user/Noosa_Engage' >> /home/ec2-user/Noosa_Engage/deploy.log
cd /home/ec2-user/Noosa_Engage >> /home/ec2-user/Noosa_Engage/deploy.log

echo 'npm install' >> /home/ec2-user/Noosa_Engage/deploy.log 
npm install >> /home/ec2-user/Noosa_Engage/deploy.log

echo 'Running updateTimes script' >> /home/ec2-user/Noosa_Engage/deploy.log
npm run updateTimes >> /home/ec2-user/Noosa_Engage/deploy.log