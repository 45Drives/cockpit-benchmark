COCKPIT_HOST="root@192.168.122.24"

echo 'Removing old files....'
ssh $COCKPIT_HOST 'rm -rf /usr/share/cockpit/benchmark'

echo 'Stopping cockpit....'
ssh $COCKPIT_HOST 'systemctl stop cockpit.socket'

echo 'Upload new files....'
rsync -r benchmark/* $COCKPIT_HOST:/usr/share/cockpit/benchmark

echo 'Starting cockpit....'
ssh $COCKPIT_HOST 'systemctl start cockpit.socket --now'