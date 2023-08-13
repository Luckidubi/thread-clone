import UserCard from "@/components/cards/UserCard";
import { fetchSearch, fetchUser } from "@/lib/actions/user.actions";
import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

async function Page() {
    const user = await currentUser();
    if (!user) return null;

    const userInfo = await fetchUser(user.id);

    if (!userInfo?.onboarded) redirect("/onboarding");

    const result = await fetchSearch({
        userId: user.id,
        searchString: "",
        pageNumber: 1,
        pageSize: 25,
        sortBy: "desc",
    })
  return (
    <section>
       <h1 className="head-text mb-10">Search</h1>

       <div className="mt-14 flex flex-col gap-9">
        {result.users.length === 0 ? (
            <p className="no-result">No users found</p>
        ): (
            <>
            {result.users.map((user)=>(
                <UserCard
                key={user._id}
                id={user.id}
                name={user.name}
                username={user.username}
                imgUrl={user.image}
                personType="User"
                />
            ))}
            </>
        )}

       </div>
        </section>
  )
}

export default Page