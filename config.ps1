$lname=$args[0]
$lbigdata=$args[1]
echo "Git config start"
echo "git config remote.origin.url https://$($lname):$($lbigdata)@github.com/$($lname)/test_hub"
git config remote.origin.url https://$($lname):$($lbigdata)@github.com/$($lname)/test_hub
git config push.default simple
echo "Git config done"
