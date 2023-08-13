"use server";

import { revalidatePath } from "next/cache";
import User from "../models/user";
import connectToDB from "../mongoose";
import Thread from "../models/thread";
import { FilterQuery } from "mongoose";

interface Props {
  userId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
}
export async function updateUser({
  userId,
  username,
  name,
  bio,
  image,
  path,
}: Props): Promise<void> {
  await connectToDB();

  try {
    await User.findOneAndUpdate(
      { id: userId },
      {
        username: username.toLowerCase(),
        name,
        bio,
        image,
        onboarded: true,
      },

      { upsert: true }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error("Failed to create/update user: " + error.message);
  }
}

export async function fetchUser(userId: string) {
  try {
    await connectToDB();
    return await User.findOne({ id: userId });
  } catch (error: any) {
    throw new Error("Failed to fetch user: " + error.message);
  }
}

export async function fetchUserPosts(userId: string) {
  try {
    await connectToDB();
    const threads = await User.findOne({ id: userId }).populate({
      path: "threads",
      model: Thread,
      populate: {
        path: "children",
        model: Thread,
        populate: {
          path: "author",
          model: User,
          select: "name image id",
        },
      },
    });

    return threads;
  } catch (error: any) {
    throw new Error("Failed to fetch user posts: " + error.message);
  }
}

interface fetchSearchProps {
  userId: string;
  searchString: string;
  pageNumber: number;
  pageSize: number;
  sortBy: string;
}
export async function fetchSearch({
  userId,
  searchString = "",
  pageNumber = 1,
  pageSize = 20,
  sortBy = "desc",
}: fetchSearchProps) {
  try {
    await connectToDB();
    const skipAmount = (pageNumber - 1) * pageSize;
    const regex = new RegExp(searchString, "i");

    const query: FilterQuery<typeof User> = {
      id: { $ne: userId },
    };
    if (searchString.trim() !== "") {
      query.$or = [
        { name: { $regex: regex } },
        { username: { $regex: regex } },
      ];
    }

    const sortOptions: any = { createdAt: sortBy };
    const userQuery = User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize);

    const totalUsersCount = await User.countDocuments(query);

    const users = await userQuery;

    const isNext = totalUsersCount > skipAmount + users.length;

    return {
      users,
      isNext,
    };
  } catch (error: any) {
    throw new Error("Failed to fetch users: " + error.message);
  }
}

export async function getActivity(userId: string){
  try{
    await connectToDB();

    const userThreads = await Thread.find({
      author: userId
    })

    const childThreadIds = userThreads.reduce((acc, userThread) => {
      return acc.concat(userThread.children);
    }, [])

    const replies = await Thread.find({
      _id: {
        $in: childThreadIds
      },
      author: {
        $ne: userId
      }
    }).populate({
      path: "author",
      model: User,
      select: "name image _id"
    })

    return replies
  } catch (error: any) {
    throw new Error("Failed to fetch users: " + error.message);
  }
}