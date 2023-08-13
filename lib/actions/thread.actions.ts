"use server";
import { revalidatePath } from "next/cache";
import Thread from "../models/thread";
import User from "../models/user";
import connectToDB from "../mongoose";

interface Props {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function createThread({ text, author, communityId, path }: Props) {
  try {
    await connectToDB();
    const createdThread = await Thread.create({
      text,
      author,
      communityId: null,
      path,
    });

    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    revalidatePath(path);
  } catch (error: any) {
    throw new Error("Failed to create thread: " + error.message);
  }
}

export async function fetchThread(pageNumber = 1, pageSize = 20) {
  await connectToDB();
  const skipAmount = (pageNumber - 1) * pageSize;

  //Fetch the posts that have no parents (top-level threads)

  const postsQuery = await Thread.find({
    parentId: { $in: [null, undefined] },
  })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({
      path: "author",
      model: "User",
    })
    .populate({
      path: "children",
      populate: {
        path: "author",
        model: "User",
        select: "_id name parentId image",
      },
    });

  const totalPostsCount = await Thread.countDocuments({
    parentId: { $in: [null, undefined] },
  });

  const posts = await postsQuery;

  const isNext = totalPostsCount > skipAmount + posts.length;

  return {
    posts,
    isNext,
  };
}

export async function fetchThreadById(id: string) {
  await connectToDB();
  try{
    const thread = await Thread.findById(id)
    .populate({
      path: "author",
      model: User,
      select: "id name image",
    })
    .populate({
      path: "children",
      populate: [
        {
          path: "author",
          model: User,
          select: "id name parentId image",
        },
        {
          path: "children",
          model: Thread,
          populate:
            {
              path: "author",
              model: User,
              select: "_id id name parentId image",
            },
        }
      ]
    }).exec();
    return thread;
  } catch (error: any) {
    throw new Error("Failed to fetch thread: " + error.message);
  }
}

export async function addCommentToThread(
  threadId: string,
  commentText: string,
  userId: string,
  path: string
){
  await connectToDB();

  try{
    const originalThread = await Thread.findById(threadId);

    if(!originalThread){
      throw new Error("Thread not found");
    }

    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId,
    })

    // Save the new thread
    const savedThread = await commentThread.save();

    // Update the original thread
    originalThread.children.push(savedThread._id);

    // Save the original thread
    await originalThread.save();

    revalidatePath
  } catch (error: any) {
    throw new Error("Failed to add comment: " + error.message);
  }
}