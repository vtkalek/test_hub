$lname=$args[0]
$lbigdata=$args[1]
cd .publish
dir
git config --global push.default matching
git config remote.origin.url https://$($lname):$($lbigdata)@github.com/$($lname)/test_hub
git config --list
git push