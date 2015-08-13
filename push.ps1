$lname=$args[0]
$lbigdata=$args[1]
cd .publish
dir

git config remote.origin.url https://$($lname):$($lbigdata)@github.com/$($lname)/test_hub
git config  user.email "v-tkalek@microsoft.com"
git config  user.name "vtkalek"
git config --local core.ignorecase false
git config --local core.autocrlf false
git config --local push.default simple
git config --list
echo "commit"
git commit
echo "push"
git push
